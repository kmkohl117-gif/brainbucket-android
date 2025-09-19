#!/bin/bash

# Custom production build script
# This script fixes the CORS dependency bundling issue

echo "Building application for production..."

# Build the frontend
echo "Building frontend with Vite..."
npx vite build

# Build the backend with dependencies bundled (removing --packages=external)
echo "Building backend with esbuild (bundling dependencies)..."
npx esbuild server/index.ts --platform=node --bundle --format=esm --outdir=dist

echo "Production build complete!"
echo "Frontend built to: dist/public"
echo "Backend built to: dist/index.js"