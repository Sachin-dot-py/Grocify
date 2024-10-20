# Grocify

Grocify is an all-in-one food tracking, grocery management, and cooking assistant platform designed to help users efficiently manage their kitchen inventory. It provides features such as barcode scanning, personalized recipe suggestions, dietary-specific custom recipe generation, and more, making it easier to manage ingredients, minimize food waste, and explore new recipes.

## Features

- **Barcode Scanning**: Add items to your inventory by scanning barcodes using a webcam or a mobile camera.
- **Inventory Management**: Keep track of all the ingredients in your kitchen with expiration tracking.
- **Recipe Suggestions**: Automatically generate recipes based on the ingredients in your inventory, prioritizing those nearing expiration.
- **Custom Recipe Crafting**: Create custom recipes based on dietary restrictions, preferred cuisines, and special requests.

## Tech Stack

- **Frontend**: React.js with Bootstrap for styling.
- **Backend**: Flask (Python) for API and backend functionality.
- **Database**: MongoDB Atlas for storing inventory items and user information.
- **Web Server**: Nginx used for serving frontend and acting as a reverse proxy for the backend.
- **Deployment**: DigitalOcean Droplet.

## Installation and Setup

### Prerequisites

- Ubuntu-based server (e.g., DigitalOcean Droplet)
- Node.js and npm
- Python 3 and pip
- MongoDB Atlas account

### Step 1: Clone the Repository

### Step 2: Backend Setup

### Step 3: Frontend Setup

### Step 4: Configure Nginx

### Step 5: Set Up Gunicorn Service

### Step 6: Obtain and Configure SSL Certificate

### Step 7: Update and Redeploy

To update and redeploy your application after making changes, run the provided update script

This script pulls the latest code from the repository, rebuilds the frontend, and restarts Nginx and Gunicorn services.

