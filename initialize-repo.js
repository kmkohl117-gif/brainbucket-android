import { getUncachableGitHubClient } from './server/github-client.js';

const REPO_OWNER = 'kmkohl117-gif';
const REPO_NAME = 'brainbucket-android';

async function initializeRepo() {
    try {
        console.log('🔧 Initializing empty repository...');
        
        const octokit = await getUncachableGitHubClient();
        
        // Create initial README to initialize the repository
        const readmeContent = `# BrainBucket Android

🧠 **Personal ADHD-friendly productivity app for Android phones**

## Features
- ⚡ **Quick Capture** - Instantly record thoughts, tasks, and ideas
- 🗂️ **Bucket Organization** - Organize content in customizable buckets
- 📱 **Offline-First** - Works completely offline with local storage
- 🔒 **Biometric Security** - Secure authentication with fingerprint/face
- 🔔 **Local Notifications** - Reminders that work without internet
- 🔍 **Global Search** - Find anything across all your captures

## Technology
- **React + Capacitor** for native Android experience
- **IndexedDB** for offline data persistence
- **GitHub Actions** for automatic APK building
- **WebAuthn** for biometric authentication

## APK Building
This repository automatically builds Android APK files via GitHub Actions on every push to main branch.

**Download your APK:**
1. Go to **Actions** tab
2. Click latest build (green ✅)
3. Download **brainbucket-debug** from Artifacts
4. Install on your Android device

---
*Built with ❤️ for personal productivity*`;

        await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: 'README.md',
            message: '🎉 Initial commit: Initialize BrainBucket repository',
            content: Buffer.from(readmeContent).toString('base64')
        });

        console.log('✅ Repository initialized with README');
        
        // Now create the GitHub Actions workflow
        const workflowContent = `name: Build Android APK

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build web assets
      run: npm run build
      
    - name: Setup Java JDK
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        
    - name: Setup Android SDK
      uses: android-actions/setup-android@v3
      with:
        api-level: 34
        target: default
        arch: x86_64
        
    - name: Cache Gradle dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.gradle/caches
          ~/.gradle/wrapper
        key: \${{ runner.os }}-gradle-\${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
        restore-keys: |
          \${{ runner.os }}-gradle-
          
    - name: Make gradlew executable
      run: chmod +x android/gradlew
      
    - name: Sync Capacitor
      run: npx cap sync android
      
    - name: Build debug APK
      working-directory: android
      run: ./gradlew assembleDebug
      
    - name: Upload debug APK
      uses: actions/upload-artifact@v4
      with:
        name: brainbucket-debug
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 30
        
    - name: Build release APK (unsigned)
      working-directory: android
      run: ./gradlew assembleRelease
      
    - name: Upload release APK
      uses: actions/upload-artifact@v4
      with:
        name: brainbucket-release-unsigned
        path: android/app/build/outputs/apk/release/app-release-unsigned.apk
        retention-days: 30`;

        await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: '.github/workflows/build-android.yml',
            message: '🚀 Add GitHub Actions workflow for automatic APK building',
            content: Buffer.from(workflowContent).toString('base64')
        });

        console.log('✅ GitHub Actions workflow added');
        console.log('');
        console.log('🎉 Repository initialized successfully!');
        console.log(`📱 Repository: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
        console.log('');
        console.log('📋 Next: Upload your project files manually via GitHub web interface');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        if (error.response?.data) {
            console.error('Response:', error.response.data);
        }
    }
}

initializeRepo();