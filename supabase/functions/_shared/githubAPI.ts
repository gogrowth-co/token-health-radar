// GitHub API client for development metrics
export async function fetchGitHubRepoData(githubUrl: string) {
  try {
    // Extract owner and repo from GitHub URL
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = githubUrl.match(urlPattern);
    
    if (!match) {
      console.log(`[GITHUB] Invalid GitHub URL format: ${githubUrl}`);
      return null;
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present
    
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

    // Fetch repository data
    const repoUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
    console.log(`[GITHUB] Fetching repo data: ${repoUrl}`);
    
    const repoResponse = await fetch(repoUrl, { headers });
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    
    // Fetch recent commits (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const commitsUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/commits?since=${since}&per_page=100`;
    
    const commitsResponse = await fetch(commitsUrl, { headers });
    const commitsData = commitsResponse.ok ? await commitsResponse.json() : [];
    
    // Fetch open and closed issues
    const issuesUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/issues?state=all&per_page=100`;
    const issuesResponse = await fetch(issuesUrl, { headers });
    const issuesData = issuesResponse.ok ? await issuesResponse.json() : [];
    
    // Fetch contributors
    const contributorsUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contributors?per_page=100`;
    const contributorsResponse = await fetch(contributorsUrl, { headers });
    const contributorsData = contributorsResponse.ok ? await contributorsResponse.json() : [];
    
    // Calculate metrics
    const openIssues = issuesData.filter((issue: any) => issue.state === 'open' && !issue.pull_request).length;
    const closedIssues = issuesData.filter((issue: any) => issue.state === 'closed' && !issue.pull_request).length;
    const totalIssues = openIssues + closedIssues;
    const contributorsCount = contributorsData.length || 0;
    
    console.log(`[GITHUB] Repository metrics for ${owner}/${cleanRepo}:`);
    console.log(`[GITHUB] - Stars: ${repoData.stargazers_count}`);
    console.log(`[GITHUB] - Forks: ${repoData.forks_count}`);
    console.log(`[GITHUB] - Commits (30d): ${commitsData.length}`);
    console.log(`[GITHUB] - Contributors: ${contributorsCount}`);
    console.log(`[GITHUB] - Open Issues: ${openIssues}`);
    console.log(`[GITHUB] - Closed Issues: ${closedIssues}`);
    console.log(`[GITHUB] - Last Push: ${repoData.pushed_at}`);
    
    return {
      owner,
      repo: cleanRepo,
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