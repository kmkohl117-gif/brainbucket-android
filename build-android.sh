#!/bin/bash

# BrainBucket Android Build Script
# This script builds the React app and creates an Android APK

echo "Building BrainBucket for Android..."

# Set Java environment
export JAVA_HOME=/nix/store/zmj3m7wrgqf340vqd4v90w8dw371vhjg-openjdk-17.0.7+7/lib/openjdk

# Build the React app
echo "Building React app..."
npm run build

# Sync with Capacitor
echo "Syncing with Capacitor..."
npx cap sync android

# Build Android APK (uncomment when Android SDK is available)
# echo "Building Android APK..."
# npx cap build android

echo "Build process complete!"
echo "To generate APK, ensure Android SDK is installed and run: npx cap build android"
echo "To run in development: npx cap run android"
echo "To open in Android Studio: npx cap open android"