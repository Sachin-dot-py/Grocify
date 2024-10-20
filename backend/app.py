from flask import Flask, request, jsonify
from datetime import timedelta
import os
import requests
from pymongo import MongoClient
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
import base64
import json
from openai import OpenAI
from dotenv import load_dotenv
from bson import ObjectId
from flask_cors import CORS
import datetime

load_dotenv()
app = Flask(__name__)
CORS(app)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)  # Extend token validity to 7 days

# Custom JSON encoder to handle ObjectId
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

app.json_encoder = JSONEncoder

# MongoDB setup
client = MongoClient(os.getenv("MONGO_URI"))  # Add your MongoDB Atlas URI
db = client.grocify
items_collection = db.items
users_collection = db.users
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
gpt_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROK_API_KEY"))

# BarcodeLookup API credentials
BARCODE_LOOKUP_API_KEY = os.getenv("BARCODE_API_KEY")
BARCODE_LOOKUP_API_URL = "https://api.barcodelookup.com/v3/products"

# For CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

# User registration
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    # Check if the username already exists
    if users_collection.find_one({'username': username}):
        return jsonify({'error': 'Username already exists'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = {
        'username': username,
        'password': hashed_password,
        'dietary_restrictions': None  # Initialize dietary restrictions as None
    }
    users_collection.insert_one(user)

    return jsonify({'message': 'User registered successfully'}), 201

# User login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    user = users_collection.find_one({'username': username})
    if user and bcrypt.check_password_hash(user['password'], password):
        access_token = create_access_token(identity=username)
        refresh_token = create_refresh_token(identity=username)
        return jsonify({'access_token': access_token, 'refresh_token': refresh_token}), 200
    elif user:
        return jsonify({'error': 'Incorrect password'}), 401
    else:
        return jsonify({'error': 'Username does not exist'}), 401

# Refresh token route
@app.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user)
    return jsonify({'access_token': new_access_token}), 200

# Update dietary restrictions
@app.route('/api/user-info', methods=['PUT'])
@jwt_required()
def update_user_info():
    try:
        current_user = get_jwt_identity()
        data = request.json
        dietary_restrictions = data.get('dietary_restrictions')

        # Update dietary restrictions in the user's document
        result = users_collection.update_one(
            {'username': current_user},
            {'$set': {'dietary_restrictions': dietary_restrictions}}
        )

        if result.matched_count == 1:
            return jsonify({'message': 'Dietary restrictions updated successfully'}), 200
        else:
            return jsonify({'error': 'Failed to update dietary restrictions'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to fetch user information
@app.route('/api/user-info', methods=['GET'])
@jwt_required()
def user_info():
    try:
        current_user = get_jwt_identity()
        user = users_collection.find_one({'username': current_user})

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'username': user['username'],
            'dietary_restrictions': user.get('dietary_restrictions')
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to handle barcode lookup
@app.route('/api/barcode/<barcode>', methods=['GET'])
@jwt_required()
def lookup_barcode(barcode):
    try:
        # Make the API call to BarcodeLookup.com
        params = {
            'barcode': barcode,
            'key': BARCODE_LOOKUP_API_KEY
        }
        response = requests.get(BARCODE_LOOKUP_API_URL, params=params)
        
        # Check if the response status is OK (200)
        if response.status_code != 200:
            return jsonify({'error': f'API request failed with status code {response.status_code}'}), 500
        
        # Parse the response as JSON
        data = response.json()

        # Check if data was found
        if 'products' in data and len(data['products']) > 0:
            product = data['products'][0]  # Get the first product match
            product_name = product.get('title', 'Unknown Product')
            product_image = product['images'][0] if 'images' in product and len(product['images']) > 0 else None

            return jsonify({
                'name': product_name,
                'image': product_image
            })
        else:
            return jsonify({'error': 'Product not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to add the item with expiry date
@app.route('/api/add-item', methods=['POST'])
@jwt_required()
def add_item():
    data = request.json
    barcode = data.get('barcode')
    name = data.get('name')
    image = data.get('image')
    expiry_date = data.get('expiry_date')

    # Ensure all required data is present
    if not all([name, image, expiry_date]):
        return jsonify({'error': 'Missing data'}), 400

    # Insert the item into MongoDB
    item = {
        'username': get_jwt_identity(),
        'barcode': barcode,
        'item_name': name,
        'image': image,
        'expiry_date': expiry_date
    }
    items_collection.insert_one(item)

    return jsonify({'message': 'Item added successfully'}), 201

# Route to fetch LLM-based item info (expiry date and dietary compatibility)
@app.route('/api/get-item-info', methods=['POST'])
@jwt_required()
def get_item_info():
    try:
        data = request.json
        item_name = data.get('item_name')
        if not item_name:
            return jsonify({'error': 'No item name provided'}), 400

        dietary_restrictions = users_collection.find_one({'username': get_jwt_identity()}).get('dietary_restrictions')
        # Use GPT to evaluate dietary compatibility and estimate expiry
        response = gpt_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[
                {
                    "role": "system",
                    "content": "Provide a JSON response indicating whether a given item meets specified dietary restrictions and an estimated expiry date for the item.\n\n# Steps\n\n1. **Understand the Input Parameters:**\n   - `item_name`: The name of the item to be evaluated.\n   - `current_date`: The date on which the assessment is made.\n   - `dietary_restrictions`: A list of dietary restrictions that the item must comply with.\n\n2. **Assess Dietary Compatibility:**\n   - Identify whether the `item_name` complies with the provided `dietary_restrictions`.\n   - Determine compatibility as \"yes\" if all restrictions are met, otherwise \"no.\"\n\n3. **Estimate Expiry Date:**\n   - Provide an estimated expiry date for the `item_name`, taking into account typical shelf life and storage conditions.\n\n4. **Prepare JSON Response:**\n   - Include the key `dietary_compatible` with a value of \"yes\" or \"no.\"\n   - Include `estimated_expiry_date` with the calculated date."
                },
                {
                    "role": "user",
                    "content": json.dumps({
                        "item_name": item_name,
                        "current_date": str(datetime.date.today()),
                        "dietary_restrictions": dietary_restrictions
                    })
                }
            ],
            temperature=0.5,
            max_tokens=200,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            response_format={"type": "json_object"}
        )

        if response and response.choices:
            item_info = response.choices[0].message.content.strip()
            item_info_json = json.loads(item_info)
            return jsonify(item_info_json), 200
        else:
            return jsonify({'error': 'Failed to retrieve item information from GPT'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to extract item information from an image
@app.route('/api/extract-info', methods=['POST'])
@jwt_required()
def extract_info():
    try:
        data = request.json
        image_data = data.get('image')

        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        img_type = image_data.split(';')[0].split(':')[1]

        # Decode the image data
        image_bytes = base64.b64decode(image_data.split(',')[1])

        # Convert image bytes to base64 string
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        # Use GPT to extract information
        response = gpt_client.chat.completions.create(
            model="llama-3.2-90b-vision-preview",
            messages=[
                {
                   "role": "user",
                    "content": "Identify items in images and return structured information about them in a specified JSON format.\n\nWhen provided with an image of an item, your response should include:\n- The specific name of the item.\n- A list of common allergens or dietary restrictions the item contains.\n\n# Output Format\n\nRespond only in the following JSON format:\n{\n  \"item_name\": \"specific item name\",\n  \"allergens\": [\"list of common allergens or dietary restrictions\"]\n}\n\n# Notes\n\n- Ensure each field is correctly filled with relevant information based on the item in the image.\n- Include allergens if they are widely recognized and relevant to the item."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Image"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{img_type};base64,{image_base64}"},
                        },
                    ],
                }
            ],
            temperature=0.2,
            max_tokens=100,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            response_format={"type": "json_object"},
        )
        print(response)
        if response and response.choices:
            item_info = response.choices[0].message.content.strip()
            item_info_json = json.loads(item_info)
        else:
            return jsonify({'error': 'No valid response from GPT'}), 500

        return jsonify(item_info_json), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Route to fetch inventory items
@app.route('/api/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    try:
        current_user = get_jwt_identity()  # Get the username from the token
        items = items_collection.find({"username": current_user})
        inventory_list = []
        for item in items:
            inventory_list.append({
                "_id": str(item["_id"]),
                "item_name": item["item_name"],
                "expiry_date": item["expiry_date"],
                "image": item["image"]
            })
        return jsonify(inventory_list), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to delete an item from inventory
@app.route('/api/inventory/<item_id>', methods=['DELETE'])
@jwt_required()
def delete_item(item_id):
    try:
        # Convert item_id to ObjectId
        item_id = ObjectId(item_id)
        current_user = get_jwt_identity()
        
        # Find and delete the item for the current user
        result = items_collection.delete_one({'_id': item_id, 'username': current_user})
        
        if result.deleted_count == 1:
            return jsonify({'message': 'Item deleted successfully'}), 200
        else:
            return jsonify({'error': 'Item not found or unauthorized access'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Live Chat with Recipe Assistant
@app.route('/api/chat-recipe', methods=['POST'])
@jwt_required()
def chat_recipe():
    try:
        # Get user identity and input data
        current_user = get_jwt_identity()
        data = request.json
        messages = data.get('messages')
        recipe_name = data.get('recipe_name')
        description = data.get('description')
        ingredients = data.get('ingredients')
        steps = data.get('steps')

        if not messages:
            return jsonify({'error': 'No messages provided'}), 400

        # Include recipe context in each request to maintain context
        recipe_context = [
            {
                "role": "system",
                "content": """Answer any user's follow-up questions about the process of cooking a given recipe using the provided details.

You have access to:
- Recipe name
- Description
- Ingredients
- Steps

# Steps

1. **Review the Recipe**: Understand the full recipe including its name, description, ingredients, and steps.
2. **Clarify the Question**: Identify what specific aspect of the recipe the user's question pertains to.
3. **Reasoning**: Use the information from the recipe to determine the most accurate and helpful response.
4. **Provide the Answer**: Give a clear and concise answer, ensuring it's directly related to the question asked.

# Output Format

- Provide a clear and concise paragraph addressing the user's question.
- Include any specific details or references from the recipe as needed to enhance clarity.
- If applicable, suggest alternative methods or tips related to the question.

# Examples

### Example 1:

**Input:** 
User Question: "What temperature should I bake the cake at?"
Recipe Name: "Chocolate Fudge Cake"
Ingredients: ["2 cups all-purpose flour", "1 cup unsweetened cocoa powder", ...]
Steps: ["Preheat oven to 350°F (175°C).", ...]

**Output:**
"The Chocolate Fudge Cake should be baked at 350°F (175°C), as noted in the first step of the recipe."

### Example 2:

**Input:** 
User Question: "How do I know when the chicken is fully cooked?"
Recipe Name: "Roast Chicken Dinner"
Ingredients: ["1 whole chicken", ...]
Steps: ["Preheat the oven to 375°F (190°C).", "Roast the chicken for about 1 hour and 20 minutes, or until its internal temperature reaches 165°F (74°C).", ...]

**Output:**
"The chicken is fully cooked when its internal temperature reaches 165°F (74°C), which is recommended in the roasting step of the recipe."

# Notes

- Ensure answers are based on the recipe details provided.
- Handle edge cases, such as missing temperature or cooking times, by advising a standard reference or suggesting checking the recipe again.
- Keep responses polite and informative.
- Avoid off-topic questions or topics.\n""" + f"Recipe Name: {recipe_name}\nDescription: {description}\nIngredients: {ingredients}\nSteps: {steps}"
            }
        ]
        messages_with_context = recipe_context + messages

        # Use OpenAI to get a response for the chat with the provided system prompt
        response = gpt_client.chat.completions.create(
            model="gemma2-9b-it",
            messages=messages_with_context,
            temperature=1,
            max_tokens=150,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )

        if response and response.choices:
            assistant_message = response.choices[0].message.content.strip()
            return jsonify(assistant_message), 200
        else:
            return jsonify({'error': 'Failed to generate response from assistant'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

 
# Route to generate custom recipe using LLM
@app.route('/api/generate-custom-recipe', methods=['POST'])
@jwt_required()
def generate_custom_recipe():
    try:
        data = request.json
        ingredients = data.get('ingredients')
        ingredients = [{"item_name": item["item_name"], "expiry_date": item["expiry_date"]} for item in ingredients]
        dietary_restrictions = data.get('dietary_restrictions', [])
        cuisine = data.get('cuisine', '')
        special_requests = data.get('special_requests', '')

        if not ingredients:
            return jsonify({'error': 'No ingredients provided'}), 400

        # Update prompt to include dietary restrictions, cuisine, and special requests
        system_content = "Take an input in JSON format containing a list of ingredients (item_name, expiry_date). Generate a recipe using these ingredients.\n\nTo create the recipe:\n- Minimize the use of unavailable ingredients.\n- Prioritize ingredients nearing expiry.\n- Ensure recipes are specific.\n- Include missing ingredients (those required but not available) with quantities.\n\nConsider user preferences:\n" + f"- Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}\n" + f"- Preferred Cuisine: {cuisine}\n" + f"- Special Requests: {special_requests}\n" + "# Output Format\n\nThe output should be a JSON object:\n- recipe_name: Name of the recipe.\n- description: Brief description.\n- ingredients: Array of objects (item_name, quantity, unit).\n- steps: Array of preparation steps.\n- missing_ingredients: Array of missing ingredients (item_name, quantity, unit)."
        
        # Use LLM to generate a custom recipe
        response = gpt_client.chat.completions.create(
            model="gemma2-9b-it",
            messages=[
                {
                    "role": "system",
                    "content": system_content
                },
                {
                    "role": "user",
                    "content": json.dumps(ingredients)
                }
            ],
            temperature=1,
            max_tokens=2048,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            response_format={"type": "json_object"}
        )

        if response and response.choices:
            recipe_data = response.choices[0].message.content.strip()
            print(recipe_data)
            recipe_json = json.loads(recipe_data)
            return jsonify(recipe_json), 200
        else:
            return jsonify({'error': 'Failed to generate custom recipe'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-recipe', methods=['POST'])
@jwt_required()
def generate_recipe():
    try:
        data = request.json
        ingredients = data.get('ingredients')
        ingredients = [{"item_name": item["item_name"], "expiry_date": item["expiry_date"]} for item in ingredients]

        if not ingredients:
            return jsonify({'error': 'No ingredients provided'}), 400

        # Use LLM to generate a recipe
        response = gpt_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[
                {
                    "role": "system",
                    "content": "Take an input in a JSON format containing a list of ingredients with properties: item_name and expiry_date. Generate a recipe that can be made with these ingredients.\n\nTo create a recipe:\n- Minimize the use of ingredients not already available.\n- Prioritize using ingredients with upcoming expiry dates.\n- Ensure recipes are specific and not vague.\n\n# Steps\n\n1. Analyze the list of available ingredients, focusing on those nearing expiry.\n2. Identify potential recipes that can be made with the given ingredients.\n3. Evaluate how well the available ingredients fit the chosen recipe, considering substitutions if needed.\n4. Clearly outline the recipe with all required steps and quantities.\n5. List any additional ingredients needed (i.e., the missing ingredients that are required for the recipe but are not available) with the quantity required.\n\n# Output Requirements\n- Always return a valid JSON format result.\n- Avoid null values. If any value cannot be provided, use a reasonable default.\n\n# Output Format\n\nThe output should be a JSON object with the following structure:\n- recipe_name: A descriptive name for the recipe.\n- description: A brief description of the recipe.\n- ingredients: An array of objects, each with item_name, quantity, and unit.\n- steps: An array of strings, each a step in the preparation process.\n- missing_ingredients: An array of objects, each with item_name, quantity, and unit, detailing ingredients needed for the recipe that are not available."
                },
                {
                    "role": "user",
                    "content": json.dumps(ingredients)
                }
            ],
            temperature=1,
            max_tokens=2048,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0,
            response_format={"type": "json_object"}
        )

        if response and response.choices:
            recipe_data = response.choices[0].message.content.strip()
            print(recipe_data)
            recipe_json = json.loads(recipe_data)
            return jsonify(recipe_json), 200
        else:
            return jsonify({'error': 'Failed to generate recipe'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=8000)
