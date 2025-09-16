#!/bin/bash

echo "🚀 Setting up GitHub push for BrainBucket APK building..."
echo ""

# Your repository details
REPO_URL="https://github.com/kmkohl117-gif/brainbucket-android.git"
USERNAME="kmkohl117-gif"

echo "📱 Repository: $REPO_URL"
echo ""

# Check if .git exists
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "📋 Git repository already exists"
fi

# Add remote (safely)
echo "🔗 Setting up GitHub remote..."
git remote remove origin 2>/dev/null || true
git remote add origin $REPO_URL
echo "✅ GitHub remote configured"

# Create .gitignore for clean commits
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Build outputs  
dist/
build/

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Environment variables
.env
.env.local

# Temporary files
*.tmp
*.log

# Capacitor
ios/
android/DerivedData/

# Keep android build structure but ignore outputs
android/app/build/
android/build/
android/.gradle/
android/local.properties

# Keep GitHub Actions
!.github/
EOF

echo "✅ .gitignore created"

# Stage all files
echo "📦 Adding all project files..."
git add .
echo "✅ Files staged"

# Set user info for commit
echo "👤 Setting up git user info..."
git config user.name "$USERNAME"
git config user.email "$USERNAME@users.noreply.github.com"
echo "✅ Git user configured"

# Commit
echo "💾 Creating initial commit..."
git commit -m "🎉 Initial commit: BrainBucket Android APK with GitHub Actions

✨ Features:
- Complete React + Capacitor Android app
- Offline-first with IndexedDB storage  
- Biometric authentication
- Bucket-based organization
- Quick capture functionality
- Local notifications and reminders
- Cloud APK building via GitHub Actions

🚀 Ready for APK generation!"

echo "✅ Initial commit created"

# Push to GitHub
echo "🌐 Pushing to GitHub..."
echo "📋 This will trigger automatic APK building!"
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your code is now on GitHub!"
    echo ""
    echo "⏰ APK Building Started:"
    echo "   • GitHub Actions is now building your APK"
    echo "   • This takes about 5-10 minutes"
    echo "   • You'll get both debug and release APKs"
    echo ""
    echo "📱 To Download Your APK:"
    echo "   1. Go to: https://github.com/$USERNAME/brainbucket-android"
    echo "   2. Click 'Actions' tab"
    echo "   3. Click the latest build (green checkmark ✅)"
    echo "   4. Scroll down to 'Artifacts'"  
    echo "   5. Download 'brainbucket-debug' (ready to install!)"
    echo ""
    echo "🏆 Phase 1 Complete - Your APK will be ready in ~10 minutes!"
else
    echo ""
    echo "❌ Push failed. You may need to authenticate with GitHub."
    echo "💡 Try running this in the Replit Shell manually:"
    echo "   git push -u origin main"
fi