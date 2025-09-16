import { getUncachableGitHubClient } from './github-client.js';

export async function createBrainBucketRepo() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Get current user info
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`📱 Creating BrainBucket repository for ${user.login}`);
    
    // Create repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: 'brainbucket-android',
      description: 'Personal ADHD-friendly productivity app with offline Android APK - Built with React + Capacitor',
      private: false, // Public for free GitHub Actions
      auto_init: false,
      has_issues: true,
      has_projects: false,
      has_wiki: false,
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      delete_branch_on_merge: true
    });
    
    console.log(`✅ Repository created: ${repo.html_url}`);
    console.log(`🔗 Clone URL: ${repo.clone_url}`);
    
    return {
      success: true,
      repoUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      username: user.login
    };
    
  } catch (error) {
    if (error.status === 422 && error.response?.data?.errors?.some(e => e.message?.includes('already exists'))) {
      console.log('📋 Repository already exists, continuing...');
      const { data: user } = await getUncachableGitHubClient().then(client => client.rest.users.getAuthenticated());
      return {
        success: true,
        repoUrl: `https://github.com/${user.login}/brainbucket-android`,
        cloneUrl: `https://github.com/${user.login}/brainbucket-android.git`,
        username: user.login,
        existing: true
      };
    }
    
    console.error('❌ Failed to create repository:', error.message);
    throw error;
  }
}