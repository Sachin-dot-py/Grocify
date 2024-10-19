#!/bin/bash

# Update and Install Essentials
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx python3-pip python3-venv ufw certbot python3-certbot-nginx
sudo apt install npm

# Clone Project Repository
mkdir -p ~/Grocify
cd ~/Grocify
git clone https://github.com/Sachin-dot-py/Grocify .

# Set Up Python Flask Backend
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Install Gunicorn
pip install gunicorn

# Create Gunicorn Systemd Service
cat <<EOL | sudo tee /etc/systemd/system/Grocify.service
[Unit]
Description=Gunicorn instance to serve your Flask app
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/root/Grocify/backend
Environment="PATH=/root/Grocify/venv/bin"
ExecStart=/root/Grocify/venv/bin/gunicorn --workers 4 --bind 0.0.0.0:8000 app:app

[Install]
WantedBy=multi-user.target
EOL

# Enable and Start Backend Service
sudo systemctl enable Grocify
sudo systemctl start Grocify

# Set Up React Frontend
cd ~/Grocify/frontend
npm install
# TODO: .env file for frontend should be added here (.env for backend should be added at anytime)
npm run build

# Deploy Frontend with Nginx
sudo cp -r build/* /var/www/html/

# Configure Nginx
cat <<EOL | sudo tee /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOL

# Restart Nginx
sudo nginx -t && sudo systemctl restart nginx

# Do yourself: Create .env files manually

# Final Message
echo "Deployment script completed."
