// Helper function to find the main repository from an organization
async function findMainRepository(owner: string, headers: any) {
  try {
    // Try organization repos first
    let reposUrl = `https://api.github.com/orgs/${owner}/repos?sort=updated&per_page=100`;
    console.log(`[GITHUB] Fetching organization repos: ${reposUrl}`);
    
    let reposResponse = await fetch(reposUrl, { headers });
    
    // If org fails, try user repos
    if (!reposResponse.ok) {
      console.log(`[GITHUB] Organization API failed, trying user repos`);
      reposUrl = `https://api.github.com/users/${owner}/repos?sort=updated&per_page=100`;
      reposResponse = await fetch(reposUrl, { headers });
    }
    
    if (!reposResponse.ok) {
      console.log(`[GITHUB] Failed to fetch repositories for ${owner}`);
      return null;
    }
    
    const repos = await reposResponse.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      console.log(`[GITHUB] No repositories found for ${owner}`);
      return null;
    }
    
    console.log(`[GITHUB] Found ${repos.length} repositories for ${owner}`);
    
    // Filter out forks and find the main repository
    const nonForkRepos = repos.filter((repo: any) => !repo.fork);
    const targetRepos = nonForkRepos.length > 0 ? nonForkRepos : repos;
    
    // Sort by stars first, then by recent activity
    targetRepos.sort((a: any, b: any) => {
      const starDiff = (b.stargazers_count || 0) - (a.stargazers_count || 0);
      if (starDiff !== 0) return starDiff;
      
      const aUpdated = new Date(a.updated_at || a.pushed_at || 0).getTime();
      const bUpdated = new Date(b.updated_at || b.pushed_at || 0).getTime();
      return bUpdated - aUpdated;
    });
    
    const mainRepo = targetRepos[0];
    console.log(`[GITHUB] Selected main repository: ${mainRepo.name} (${mainRepo.stargazers_count} stars, last updated: ${mainRepo.updated_at})`);
    
    return {
      owner: mainRepo.owner.login,
      repo: mainRepo.name
    };
  } catch (error) {
    console.error(`[GITHUB] Error finding main repository for ${owner}:`, error);
    return null;
  }
}

// GitHub API client for development metrics
export async function fetchGitHubRepoData(githubUrl: string) {
  try {
    console.log(`[GITHUB] Processing URL: ${githubUrl}`);
    
    // Check for organization URL vs repository URL
    const orgPattern = /github\.com\/([^\/]+)\/?$/;
    const repoPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    
    const orgMatch = githubUrl.match(orgPattern);
    const repoMatch = githubUrl.match(repoPattern);
    
    let owner: string;
    let repo: string;
    
    if (repoMatch && !orgMatch) {
      // Direct repository URL
      [, owner, repo] = repoMatch;
      repo = repo.replace(/\.git$/, ''); // Remove .git suffix if present
      console.log(`[GITHUB] Direct repository URL detected: ${owner}/${repo}`);
    } else if (orgMatch) {
      // Organization URL - need to find main repository
      [, owner] = orgMatch;
      console.log(`[GITHUB] Organization URL detected: ${owner}`);
      
      // Get API key from environment
      const apiKey = Deno.env.get('GITHUB_API_KEY');
      if (!apiKey) {
        console.log(`[GITHUB] No API key configured`);
        return null;
      }

      const headers = {
        'Authorization': `token ${apiKey}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TokenHealthScan/1.0'
      };
      
      const mainRepoResult = await findMainRepository(owner, headers);
      if (!mainRepoResult) {
        console.log(`[GITHUB] Could not find main repository for organization: ${owner}`);
        return null;
      }
      
      owner = mainRepoResult.owner;
      repo = mainRepoResult.repo;
    } else {
      console.log(`[GITHUB] Invalid GitHub URL format: ${githubUrl}`);
      return null;
    }
    
    // Get API key from environment for repository data fetching
    const apiKey = Deno.env.get('GITHUB_API_KEY');
    if (!apiKey) {
      console.log(`[GITHUB] No API key configured`);
      return null;
    }

    const headers = {
      'Authorization': `token ${apiKey}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TokenHealthScan/1.0'
    };

    // Fetch repository data
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    console.log(`[GITHUB] Fetching repo data: ${repoUrl}`);
    
    const repoResponse = await fetch(repoUrl, { headers });
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    
    // Fetch recent commits (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=100`;
    
    const commitsResponse = await fetch(commitsUrl, { headers });
    const commitsData = commitsResponse.ok ? await commitsResponse.json() : [];
    
    // Fetch open and closed issues
    const issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`;
    const issuesResponse = await fetch(issuesUrl, { headers });
    const issuesData = issuesResponse.ok ? await issuesResponse.json() : [];
    
    // Fetch contributors
    const contributorsUrl = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`;
    const contributorsResponse = await fetch(contributorsUrl, { headers });
    const contributorsData = contributorsResponse.ok ? await contributorsResponse.json() : [];
    
    // Calculate metrics
    const openIssues = issuesData.filter((issue: any) => issue.state === 'open' && !issue.pull_request).length;
    const closedIssues = issuesData.filter((issue: any) => issue.state === 'closed' && !issue.pull_request).length;
    const totalIssues = openIssues + closedIssues;
    const contributorsCount = contributorsData.length || 0;
    
    console.log(`[GITHUB] Repository metrics for ${owner}/${repo}:`);
    console.log(`[GITHUB] - Stars: ${repoData.stargazers_count}`);
    console.log(`[GITHUB] - Forks: ${repoData.forks_count}`);
    console.log(`[GITHUB] - Commits (30d): ${commitsData.length}`);
    console.log(`[GITHUB] - Contributors: ${contributorsCount}`);
    console.log(`[GITHUB] - Open Issues: ${openIssues}`);
    console.log(`[GITHUB] - Closed Issues: ${closedIssues}`);
    console.log(`[GITHUB] - Last Push: ${repoData.pushed_at}`);
    
    return {
      owner,
      repo: repo,
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      commits_30d: commitsData.length || 0,
      contributors_count: contributorsCount,
      open_issues: openIssues,
      closed_issues: closedIssues,
      total_issues: totalIssues,
      last_push: repoData.pushed_at,
      is_archived: repoData.archived || false,
      is_fork: repoData.fork || false,
      language: repoData.language || null,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at
    };
  } catch (error) {
    console.error(`[GITHUB] Error fetching repository data:`, error);
    return null;
  }
}