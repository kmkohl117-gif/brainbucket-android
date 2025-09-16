import { Octokit } from '@octokit/rest';

// Get GitHub token from environment (from the integration we set up)
const token = process.env.GITHUB_TOKEN || 'your_token_here';

const octokit = new Octokit({ 
  auth: token.startsWith('ghp_') ? token : undefined
});

const REPO_OWNER = 'kmkohl117-gif';
const REPO_NAME = 'brainbucket-android';

async function checkAndCreateWorkflow() {
  try {
    console.log('🔍 Checking repository contents...');
    
    // Check if workflow exists
    try {
      const { data: workflow } = await octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: '.github/workflows/build-android.yml'
      });
      console.log('✅ Workflow file exists');
      console.log('File size:', workflow.size, 'bytes');
    } catch (error) {
      if (error.status === 404) {
        console.log('❌ Workflow file missing - creating now...');
        
        // Create a simple, working workflow
        const workflowContent = `name: Build Android APK

on:
  workflow_dispatch:
  push:
    branches: [ main ]

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
        name: brainbucket-debug-apk
        path: android/app/build/outputs/apk/debug/app-debug.apk
        retention-days: 7`;

        await octokit.rest.repos.createOrUpdateFileContents({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: '.github/workflows/build-android.yml',
          message: '🚀 Create Android APK build workflow',
          content: Buffer.from(workflowContent).toString('base64')
        });
        
        console.log('✅ Workflow created successfully!');
      } else {
        console.error('❌ Error checking workflow:', error.message);
      }
    }
    
    // List repository contents to verify
    console.log('\n📁 Repository contents:');
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: ''
    });
    
    contents.forEach(item => {
      console.log(`  ${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
    });
    
    console.log('\n🎉 Done! Check GitHub Actions now:');
    console.log(`   https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    
    // If auth fails, provide manual instructions
    if (error.status === 401) {
      console.log('\n📋 Manual steps needed:');
      console.log('1. Go to: https://github.com/kmkohl117-gif/brainbucket-android');
      console.log('2. Create folder: .github/workflows/');
      console.log('3. Create file: build-android.yml');
      console.log('4. Copy workflow content from our .github/workflows/build-android.yml file');
    }
  }
}

checkAndCreateWorkflow();