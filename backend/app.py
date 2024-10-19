from flask import Flask, request, jsonify
import os
import requests
from pymongo import MongoClient
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, set_access_cookies, unset_jwt_cookies
import json
from openai import OpenAI
from dotenv import load_dotenv
from bson import ObjectId
from datetime import timedelta
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)  # Set token expiry to 7 days
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]  # Store JWT in cookies
app.config["JWT_COOKIE_CSRF_PROTECT"] = False

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
gpt_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# BarcodeLookup API credentials
BARCODE_LOOKUP_API_KEY = os.getenv("BARCODE_API_KEY")
BARCODE_LOOKUP_API_URL = "https://api.barcodelookup.com/v3/products"

# For CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# User registration
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = {
        'username': username,
        'password': hashed_password
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
        response = jsonify({'message': 'Login successful'})
        set_access_cookies(response, access_token)
        return response, 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# User logout
@app.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    response = jsonify({'message': 'User logged out successfully'})
    unset_jwt_cookies(response)
    return response, 200

# Route to fetch user information
@app.route('/api/user-info', methods=['GET'])
@jwt_required()
def user_info():
    try:
        current_user = get_jwt_identity()  # Get the username from the token
        user = users_collection.find_one({"username": current_user})

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'username': user['username']
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
        'quantity': 1,
        'unit': 'piece',
        'expiry_date': expiry_date
    }
    items_collection.insert_one(item)

    return jsonify({'message': 'Item added successfully'}), 201

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
                "quantity": item["quantity"],
                "unit": item["unit"],
                "expiry_date": item["expiry_date"],
                "image": item["image"]
            })
        return jsonify(inventory_list), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# Route to generate recipe using GPT-4o-mini
@app.route('/api/generate-recipe', methods=['POST'])
@jwt_required()
def generate_recipe():
    try:
        data = request.json
        ingredients = data.get('ingredients')

        if not ingredients:
            return jsonify({'error': 'No ingredients provided'}), 400

        # Use GPT-4o-mini to generate a recipe
        response = gpt_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Take an input in a JSON format containing a list of ingredients with properties: item_name, quantity, unit, and expiry_date. Generate a recipe that can be made with these ingredients. \n\nTo create a recipe:\n- Minimize the use of ingredients not already available.\n- Prioritize using ingredients with upcoming expiry dates.\n- Ensure recipes are specific and not vague.\n\n# Steps\n\n1. Analyze the list of available ingredients, focusing on those nearing expiry.\n2. Identify potential recipes that can be made with the given ingredients.\n3. Evaluate how well the available ingredients fit the chosen recipe, considering substitutions if needed.\n4. Clearly outline the recipe with all required steps and quantities.\n5. List any additional ingredients needed with the quantity required.\n\n# Output Format\n\nThe output should be a JSON object with the following structure:\n- recipe_name: A descriptive name for the recipe.\n- description: A brief description of the recipe.\n- ingredients: An array of objects, each with item_name, quantity, and unit.\n- steps: An array of strings, each a step in the preparation process.\n- missing_ingredients: An array of objects, each with item_name, quantity, and unit, detailing ingredients not available."
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
            recipe_json = json.loads(recipe_data)
            return jsonify(recipe_json), 200
        else:
            return jsonify({'error': 'Failed to generate recipe'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)
