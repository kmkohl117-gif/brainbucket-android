import { getUncachableGitHubClient } from './server/github-client.js';

const REPO_OWNER = 'kmkohl117-gif';
const REPO_NAME = 'brainbucket-android';

async function createWorkflow() {
    try {
        console.log('🔧 Creating GitHub Actions workflow...');
        
        const octokit = await getUncachableGitHubClient();
        
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
        retention-days: 30
        
    - name: Display APK info
      run: |
        echo "✅ APK Build Complete!"
        echo "📱 Debug APK: Ready to install (signed for testing)"
        echo "🔧 Release APK: Unsigned (requires signing for production)"
        echo ""
        echo "📦 Download your APK from the Actions artifacts above"
        echo "💡 For personal use, download the debug APK - it works immediately!"`;

        await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: '.github/workflows/build-android.yml',
            message: '🚀 Add GitHub Actions workflow for automatic APK building',
            content: Buffer.from(workflowContent).toString('base64')
        });

        console.log('✅ GitHub Actions workflow created successfully!');
        console.log('');
        console.log('⏰ APK Building will start automatically now!');
        console.log('📱 Refresh your GitHub Actions tab to see the build');
        console.log('');
        console.log(`🔗 Direct link: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`);

    } catch (error) {
        console.error('❌ Failed to create workflow:', error.message);
        if (error.response?.data) {
            console.error('Details:', error.response.data);
        }
    }
}

createWorkflow();