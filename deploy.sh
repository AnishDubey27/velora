#!/bin/bash
set -e
set -x

echo "Starting deployment..."

# Navigate to the git repository
cd ~/velora

# Pull the latest code using the SSH key we just configured
git pull origin main

echo "Building Next.js..."
npm run build

echo "Restarting PM2.."
pm2 restart velora
pm2 save

echo "Deployment finished!"
