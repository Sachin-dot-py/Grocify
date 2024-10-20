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
        refresh_token = create_refresh_token(identity=username)  # Generate refresh token
        return jsonify({'access_token': access_token, 'refresh_token': refresh_token}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

# Refresh token route
@app.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user)
    return jsonify({'access_token': new_access_token}), 200

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
        'expiry_date': expiry_date
    }
    items_collection.insert_one(item)

    return jsonify({'message': 'Item added successfully'}), 201

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


if __name__ == '__main__':
    app.run(debug=True, port=8000)
