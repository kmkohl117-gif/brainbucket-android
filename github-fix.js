import { Octokit } from '@octokit/rest';

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function fixWorkflow() {
  try {
    console.log('🔧 Fixing GitHub Actions workflow...');
    
    const accessToken = await getAccessToken();
    const octokit = new Octokit({ auth: accessToken });
    
    const REPO_OWNER = 'kmkohl117-gif';
    const REPO_NAME = 'brainbucket-android';
    
    // Check what's actually in the repository
    console.log('📋 Checking repository structure...');
    try {
      const { data: contents } = await octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: ''
      });
      
      console.log('📁 Repository contents:');
      contents.forEach(item => {
        console.log(`  ${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
      });
      
      // Check if .github folder exists
      const hasGithubFolder = contents.some(item => item.name === '.github');
      console.log(`\n.github folder exists: ${hasGithubFolder}`);
      
      if (hasGithubFolder) {
        // Check workflows folder
        try {
          const { data: githubContents } = await octokit.rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: '.github'
          });
          
          console.log('📁 .github contents:');
          githubContents.forEach(item => {
            console.log(`  ${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
          });
          
          const hasWorkflows = githubContents.some(item => item.name === 'workflows');
          console.log(`workflows folder exists: ${hasWorkflows}`);
          
          if (hasWorkflows) {
            const { data: workflowContents } = await octokit.rest.repos.getContent({
              owner: REPO_OWNER,
              repo: REPO_NAME,
              path: '.github/workflows'
            });
            
            console.log('📁 workflows contents:');
            workflowContents.forEach(item => {
              console.log(`  📄 ${item.name} (${item.size} bytes)`);
            });
          }
          
        } catch (error) {
          console.log('❌ Error checking .github contents:', error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking repository:', error.message);
    }
    
    // Create/update the workflow file with a simple, guaranteed-to-work version
    console.log('\n🚀 Creating/updating workflow file...');
    
    const workflowContent = `name: Build Android APK

on:
  workflow_dispatch:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
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
      
    - name: Setup Java
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
      
    - name: Build APK
      working-directory: android
      run: ./gradlew assembleDebug
      
    - name: Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: brainbucket-debug-apk
        path: android/app/build/outputs/apk/debug/app-debug.apk`;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: '.github/workflows/build-android.yml',
      message: '🚀 Add Android APK build workflow',
      content: Buffer.from(workflowContent).toString('base64')
    });
    
    console.log('✅ Workflow file created/updated successfully!');
    console.log('\n📱 Next steps:');
    console.log(`1. Go to: https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`);
    console.log('2. You should now see "Build Android APK" in the left sidebar');
    console.log('3. Click it, then click "Run workflow" to start building');
    console.log('\n⏰ If you still don\'t see it, wait 1-2 minutes for GitHub to process the new workflow file');
    
  } catch (error) {
    console.error('❌ Failed to fix workflow:', error.message);
    
    // Provide manual backup plan
    console.log('\n📋 Manual backup plan:');
    console.log('1. Go to your GitHub repository');
    console.log('2. Create new file: .github/workflows/build-android.yml');
    console.log('3. Copy the content from our local .github/workflows/build-android.yml file');
    console.log('4. Commit the file');
  }
}

fixWorkflow();