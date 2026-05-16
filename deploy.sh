#!/bin/bash
set -e
set -x

echo "Starting deployment..."
cd ~

export DEBIAN_FRONTEND=noninteractive

# Install Node.js 20 if not present
if ! command -v node &> /dev/null
then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install pm2 if not present
if ! command -v pm2 &> /dev/null
then
    echo "Installing PM2..."
    sudo npm install pm2@latest -g
fi

# Setup project directory
mkdir -p velora
cd velora

echo "Extracting tarball..."
tar -xf ~/velora.tar.gz

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Building Next.js..."
npm run build

echo "Starting PM2..."
pm2 delete velora 2>/dev/null || true
PORT=3000 pm2 start npm --name "velora" -- start
pm2 save

echo "Deployment finished!"
