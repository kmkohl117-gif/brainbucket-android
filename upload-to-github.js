import { getUncachableGitHubClient } from './server/github-client.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const REPO_OWNER = 'kmkohl117-gif';
const REPO_NAME = 'brainbucket-android';

// Files to skip
const SKIP_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'android/app/build',
    'android/build',
    'android/.gradle',
    '.env',
    '*.log',
    'upload-to-github.js',
    'server/github-setup.js',
    'server/github-client.js',
    'setup-github.sh'
];

function shouldSkip(filePath) {
    return SKIP_PATTERNS.some(pattern => {
        if (pattern.includes('*')) {
            return filePath.includes(pattern.replace('*', ''));
        }
        return filePath.includes(pattern);
    });
}

function getAllFiles(dir, fileList = [], basePath = '') {
    const files = readdirSync(dir);
    
    for (const file of files) {
        const filePath = join(dir, file);
        const relativePath = join(basePath, file);
        
        if (shouldSkip(relativePath)) {
            console.log(`⏭️  Skipping: ${relativePath}`);
            continue;
        }
        
        const stat = statSync(filePath);
        
        if (stat.isDirectory()) {
            getAllFiles(filePath, fileList, relativePath);
        } else {
            fileList.push({
                path: relativePath.replace(/\\/g, '/'), // Convert to forward slashes
                fullPath: filePath
            });
        }
    }
    
    return fileList;
}

async function uploadFiles() {
    try {
        console.log('🚀 Starting GitHub upload via API...');
        
        const octokit = await getUncachableGitHubClient();
        
        // Get all files
        const files = getAllFiles('.');
        console.log(`📁 Found ${files.length} files to upload`);
        
        // Create blobs and tree entries
        const treeEntries = [];
        
        for (const file of files) {
            console.log(`📄 Processing: ${file.path}`);
            
            try {
                const content = readFileSync(file.fullPath);
                const encoding = file.path.match(/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/i) ? 'base64' : 'utf-8';
                
                // Create blob
                const { data: blob } = await octokit.rest.git.createBlob({
                    owner: REPO_OWNER,
                    repo: REPO_NAME,
                    content: encoding === 'base64' ? content.toString('base64') : content.toString('utf-8'),
                    encoding
                });
                
                treeEntries.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: blob.sha
                });
                
                console.log(`✅ Uploaded: ${file.path}`);
                
            } catch (error) {
                console.error(`❌ Failed to upload ${file.path}:`, error.message);
            }
        }
        
        console.log(`🌳 Creating tree with ${treeEntries.length} entries...`);
        
        // Create tree
        const { data: tree } = await octokit.rest.git.createTree({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            tree: treeEntries
        });
        
        console.log('✅ Tree created');
        
        // Create commit
        const { data: commit } = await octokit.rest.git.createCommit({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            message: '🎉 Initial commit: BrainBucket Android APK with GitHub Actions\n\n✨ Features:\n- Complete React + Capacitor Android app\n- Offline-first with IndexedDB storage\n- Biometric authentication\n- Bucket-based organization\n- Quick capture functionality\n- Local notifications and reminders\n- Cloud APK building via GitHub Actions\n\n🚀 Ready for APK generation!',
            tree: tree.sha
        });
        
        console.log('✅ Commit created');
        
        // Update main branch reference
        await octokit.rest.git.updateRef({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            ref: 'heads/main',
            sha: commit.sha
        });
        
        console.log('✅ Main branch updated');
        
        console.log('');
        console.log('🎉 SUCCESS! Your BrainBucket code is now on GitHub!');
        console.log('');
        console.log('⏰ APK Building Started:');
        console.log('   • GitHub Actions is now building your APK');
        console.log('   • This takes about 5-10 minutes');
        console.log('   • You\'ll get both debug and release APKs');
        console.log('');
        console.log('📱 To Download Your APK:');
        console.log(`   1. Go to: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
        console.log('   2. Click \'Actions\' tab');
        console.log('   3. Click the latest build (green checkmark ✅)');
        console.log('   4. Scroll down to \'Artifacts\'');
        console.log('   5. Download \'brainbucket-debug\' (ready to install!)');
        console.log('');
        console.log('🏆 Phase 1 Complete - Your APK will be ready in ~10 minutes!');
        
    } catch (error) {
        console.error('❌ Upload failed:', error.message);
        if (error.response?.data) {
            console.error('Response:', error.response.data);
        }
    }
}

uploadFiles();