#!/bin/bash

# Navigate to project directory
cd ~/Grocify

# Pull the latest changes from the Git repository
git pull origin main

# Rebuild the React frontend
cd frontend
npm install
npm run build

# Deploy updated frontend with Nginx
sudo cp -r build/* /var/www/html/

# Restart Nginx
sudo systemctl restart nginx

# Restart the backend Gunicorn service
sudo systemctl restart Grocify

# Final Message
echo "Update and deployment completed."
