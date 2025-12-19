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
    const ownerLower = owner.toLowerCase();
    
    // Filter out forks and find the main repository
    const nonForkRepos = repos.filter((repo: any) => !repo.fork);
    const targetRepos = nonForkRepos.length > 0 ? nonForkRepos : repos;
    
    // Enhanced repository selection algorithm with keyword-based scoring
    targetRepos.sort((a: any, b: any) => {
      const nameLowerA = a.name.toLowerCase();
      const nameLowerB = b.name.toLowerCase();
      const descLowerA = (a.description || '').toLowerCase();
      const descLowerB = (b.description || '').toLowerCase();
      
      // Keyword-based type scoring - prioritize core protocol repos
      const getRepoTypeScore = (name: string, description: string) => {
        let score = 0;
        
        // HIGH PRIORITY: Core protocol repos
        if (/^(core|protocol|contracts|main)$/i.test(name)) score += 5000;
        if (/(core|protocol|contracts)/i.test(name)) score += 3000;
        if (/-(core|protocol|contracts|main)$/i.test(name)) score += 2500;
        
        // MEDIUM PRIORITY: Project-specific repos (containing org name)
        // Extract org name parts (e.g., "maple-labs" -> ["maple", "labs"])
        const orgParts = ownerLower.split(/[-_]/).filter(p => p.length > 2);
        for (const part of orgParts) {
          if (name.toLowerCase().includes(part)) score += 1500;
        }
        
        // Check description for main project indicators
        if (/(main|core|primary|protocol|smart contract)/i.test(description)) score += 500;
        
        // PENALTY: Helper/utility repos
        if (/^(erc20|erc721|erc1155|utils?|helpers?|libs?|common|shared)$/i.test(name)) score -= 3000;
        if (/-(utils?|helpers?|libs?|common|shared)$/i.test(name)) score -= 2000;
        
        // PENALTY: Documentation/examples
        if (/(docs?|documentation|examples?|demo|tutorial|sample|template)/i.test(name)) score -= 2500;
        
        // PENALTY: Testing/tooling repos
        if (/(test|testing|scripts?|tools?|ci|infra)/i.test(name)) score -= 1500;
        
        // PENALTY: Deprecated/legacy
        if (/(legacy|old|deprecated|archive|backup)/i.test(name)) score -= 4000;
        
        return score;
      };
      
      // Version detection for repository names
      const getVersionScore = (name: string) => {
        const versionPatterns = [
          /v(\d+)\.?\d*$/i,           // v2, v1.0 at end
          /-v(\d+)\.?\d*$/i,          // LayerZero-v2
          /(\d+)\.?\d*$/,             // ending with number like protocol2
          /v(\d+)\.?\d*-/i,           // v2- in middle
        ];
        
        for (const pattern of versionPatterns) {
          const match = name.match(pattern);
          if (match) {
            return parseInt(match[1]);
          }
        }
        
        if (name.toLowerCase().includes('latest') || name.toLowerCase().includes('current')) {
          return 999;
        }
        
        return 0;
      };
      
      // Activity scoring - recent commits matter more
      const getActivityScore = (repo: any) => {
        const now = Date.now();
        const lastPush = new Date(repo.pushed_at || 0).getTime();
        const daysSinceLastPush = (now - lastPush) / (24 * 60 * 60 * 1000);
        
        // Higher score for more recent activity
        if (daysSinceLastPush < 7) return 3;    // Active in last week
        if (daysSinceLastPush < 30) return 2;   // Active in last month
        if (daysSinceLastPush < 180) return 1;  // Active in last 6 months
        return 0;                               // Stale
      };
      
      const aTypeScore = getRepoTypeScore(nameLowerA, descLowerA);
      const bTypeScore = getRepoTypeScore(nameLowerB, descLowerB);
      const aVersionScore = getVersionScore(a.name);
      const bVersionScore = getVersionScore(b.name);
      const aActivityScore = getActivityScore(a);
      const bActivityScore = getActivityScore(b);
      
      // Scoring weights: Type > Version > Activity > Stars
      const aScore = (aTypeScore) + (aVersionScore * 10000) + (aActivityScore * 1000) + Math.min(a.stargazers_count || 0, 500);
      const bScore = (bTypeScore) + (bVersionScore * 10000) + (bActivityScore * 1000) + Math.min(b.stargazers_count || 0, 500);
      
      console.log(`[GITHUB] ${a.name}: type=${aTypeScore}, ver=${aVersionScore}, act=${aActivityScore}, stars=${a.stargazers_count || 0}, TOTAL=${aScore}`);
      console.log(`[GITHUB] ${b.name}: type=${bTypeScore}, ver=${bVersionScore}, act=${bActivityScore}, stars=${b.stargazers_count || 0}, TOTAL=${bScore}`);
      
      return bScore - aScore;
    });
    
    const mainRepo = targetRepos[0];
    
    console.log(`[GITHUB] === FINAL REPOSITORY SELECTION ===`);
    console.log(`[GITHUB] ✅ SELECTED: ${mainRepo.name} (${mainRepo.stargazers_count || 0} stars)`);
    console.log(`[GITHUB] - Description: ${mainRepo.description || 'none'}`);
    console.log(`[GITHUB] - Last pushed: ${mainRepo.pushed_at}`);
    
    if (targetRepos.length > 1) {
      console.log(`[GITHUB] ❌ REJECTED TOP 5:`);
      targetRepos.slice(1, 6).forEach((repo: any, index: number) => {
        console.log(`[GITHUB]   ${index + 1}. ${repo.name} (${repo.stargazers_count || 0} stars)`);
      });
    }
    
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
    
    console.log(`[GITHUB] === FINAL REPOSITORY METRICS ===`);
    console.log(`[GITHUB] Repository: ${owner}/${repo}`);
    console.log(`[GITHUB] Stars: ${repoData.stargazers_count}`);
    console.log(`[GITHUB] Forks: ${repoData.forks_count}`);
    console.log(`[GITHUB] Contributors: ${contributorsCount} (KEY METRIC FOR UI)`);
    console.log(`[GITHUB] Commits (30d): ${commitsData.length}`);
    console.log(`[GITHUB] Open Issues: ${openIssues}`);
    console.log(`[GITHUB] Closed Issues: ${closedIssues}`);
    console.log(`[GITHUB] Last Push: ${repoData.pushed_at}`);
    console.log(`[GITHUB] This data will be used for development scoring`);
    
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