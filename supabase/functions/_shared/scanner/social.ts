// Community and development inputs as provenance-carrying Fields (Codex review 2026-09-25, finding 8).
//
// These used to bypass the reliability layer: GitHub sub-request failures became empty arrays (and the legacy
// scorer then awarded points for "no issues"), and missing community inputs were replaced by 0. Here every
// metric is a Field: a failed call is unknown with a reason, never a zero, and scoring uses only usable inputs.
import { type Field, ok, type SourceRef, unknown } from './field.ts';
import type { ScanContext } from './http.ts';
import { findMainRepository } from '../githubAPI.ts';

export interface GithubFacts {
  repo: Field<string>; // owner/repo actually read
  stars: Field<number>;
  forks: Field<number>;
  commits_30d: Field<number>;
  contributors_count: Field<number>;
  issue_close_ratio: Field<number>; // closed / (open + closed) issues (not pull requests), 0..1
  open_issues: Field<number>;
  last_push: Field<string>; // ISO timestamp
  last_push_age_days: Field<number>;
  is_archived: Field<boolean>;
  is_fork: Field<boolean>;
  language: Field<string>;
  repo_created_at: Field<string>;
}

export interface CommunityFacts {
  sentiment: Field<number>;
  social_dominance: Field<number>;
  trend: Field<string>;
  discord_members: Field<number>;
  telegram_members: Field<number>;
}

export interface SocialFacts {
  github: GithubFacts;
  community: CommunityFacts;
}

const FUTURE_SKEW_MS = 5 * 60_000;

function allGithub(reason: any, detail: string, sources: SourceRef[] = []): GithubFacts {
  const u = <T>() => unknown<T>(reason, detail, sources);
  return { repo: u(), stars: u(), forks: u(), commits_30d: u(), contributors_count: u(), issue_close_ratio: u(), open_issues: u(), last_push: u(), last_push_age_days: u(), is_archived: u(), is_fork: u(), language: u(), repo_created_at: u() };
}

export async function collectGithub(ctx: ScanContext, githubUrl: string | undefined | null, now: Date = new Date()): Promise<GithubFacts> {
  if (!githubUrl) return allGithub('not_found', 'no GitHub link listed for this token');
  const key = Deno.env.get('GITHUB_API_KEY');
  if (!key) return allGithub('provider_failed', 'GITHUB_API_KEY not configured');
  const headers = { Authorization: `token ${key}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'TokenHealthScan/1.0' };
  const orgOnly = githubUrl.match(/github\.com\/([^/]+)\/?$/);
  const repoUrl = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  let owner: string;
  let repo: string;
  if (repoUrl && !orgOnly) {
    owner = repoUrl[1];
    repo = repoUrl[2].replace(/\.git$/, '');
  } else if (orgOnly) {
    const main = await findMainRepository(orgOnly[1], headers).catch(() => null);
    if (!main) return allGithub('not_found', `no main repository found for GitHub organization ${orgOnly[1]}`);
    owner = main.owner;
    repo = main.repo;
  } else return allGithub('not_found', `unrecognised GitHub URL: ${githubUrl}`);

  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const since = new Date(now.getTime() - 30 * 86400_000).toISOString();
  const get = (path: string, excerpt?: (d: any) => Record<string, unknown>) => ctx.fetchJson('github', `${base}${path}`, { headers, retries: 1, excerpt });
  const [meta, commits, issues, contributors] = await Promise.all([
    get('', (d) => ({ stars: d.stargazers_count, forks: d.forks_count, pushed_at: d.pushed_at, archived: d.archived })),
    get(`/commits?since=${since}&per_page=100`, (d) => ({ commits: Array.isArray(d) ? d.length : null })),
    get('/issues?state=all&per_page=100', (d) => ({ items: Array.isArray(d) ? d.length : null })),
    get('/contributors?per_page=100', (d) => ({ contributors: Array.isArray(d) ? d.length : null })),
  ]);
  const fail = (r: { ok: boolean; reason?: any; detail?: string; ref: SourceRef }, what: string) => unknown<any>(r.ok ? 'no_data' : r.reason, r.ok ? `GitHub returned an unexpected ${what} response` : r.detail, [r.ref]);

  // The repository only counts as "read" when its metadata call succeeded (a 404/503 must not leave a usable repo behind).
  if (!meta.ok || typeof meta.data?.stargazers_count !== 'number') return allGithub(meta.ok ? 'no_data' : meta.reason, `repository ${owner}/${repo} metadata unavailable: ${meta.ok ? 'unexpected response' : meta.detail}`, [meta.ref]);
  const repoF = ok(`${owner}/${repo}`, meta.ref, { confidence: 'high' });

  const d = meta.data;
  const pushed = typeof d.pushed_at === 'string' && Number.isFinite(Date.parse(d.pushed_at)) ? d.pushed_at : null;
  const futurePush = pushed !== null && Date.parse(pushed) > now.getTime() + FUTURE_SKEW_MS;
  const listOf = (r: typeof commits, what: string): { ok: true; items: any[] } | { ok: false; f: Field<any> } => (r.ok && Array.isArray(r.data) ? { ok: true, items: r.data } : { ok: false, f: fail(r, what) });
  const c = listOf(commits, 'commits');
  const i = listOf(issues, 'issues');
  const k = listOf(contributors, 'contributors');
  const issueItems = i.ok ? i.items.filter((x: any) => !x.pull_request) : [];
  const closed = issueItems.filter((x: any) => x.state === 'closed').length;
  const open = issueItems.filter((x: any) => x.state === 'open').length;
  return {
    repo: repoF,
    stars: ok(d.stargazers_count, meta.ref, { unit: 'stars' }),
    forks: typeof d.forks_count === 'number' ? ok(d.forks_count, meta.ref, { unit: 'forks' }) : unknown('no_data', 'no forks_count', [meta.ref]),
    commits_30d: c.ok ? ok(c.items.length, commits.ref, { unit: 'commits', detail: c.items.length >= 100 ? 'at least 100 (first page)' : undefined }) : c.f,
    contributors_count: k.ok ? ok(k.items.length, contributors.ref, { unit: 'contributors', detail: k.items.length >= 100 ? 'at least 100 (first page)' : undefined }) : k.f,
    // No issues at all is no evidence about issue handling (it used to be worth 15 points), so it is unknown, not scored.
    issue_close_ratio: i.ok ? (closed + open > 0 ? ok(closed / (closed + open), issues.ref, { unit: 'ratio', detail: `sample metric: ${closed} closed / ${open} open among the latest ${i.items.length} issue items` }) : unknown('no_data', 'repository has no issues to judge', [issues.ref])) : i.f,
    // Only the latest 100 items are read: a count is complete only when the list is shorter than a page.
    open_issues: i.ok ? (i.items.length < 100 ? ok(open, issues.ref, { unit: 'issues' }) : unknown('no_data', 'more than 100 issue items: only a sample was read, so no complete open-issue count', [issues.ref], { unit: 'issues' })) : i.f,
    last_push: pushed && !futurePush ? ok(pushed, meta.ref, { unit: 'date' }) : unknown(futurePush ? 'failed_plausibility' : 'no_data', futurePush ? `pushed_at ${pushed} is in the future` : 'no pushed_at', [meta.ref]),
    last_push_age_days: pushed && !futurePush ? ok(Math.round(((now.getTime() - Date.parse(pushed)) / 86400_000) * 10) / 10, meta.ref, { unit: 'days' }) : unknown(futurePush ? 'failed_plausibility' : 'no_data', futurePush ? `pushed_at ${pushed} is in the future` : 'no pushed_at', [meta.ref]),
    is_archived: typeof d.archived === 'boolean' ? ok(d.archived, meta.ref, { unit: 'bool' }) : unknown('no_data', 'archived flag missing', [meta.ref], { unit: 'bool' }),
    is_fork: typeof d.fork === 'boolean' ? ok(d.fork, meta.ref, { unit: 'bool' }) : unknown('no_data', 'fork flag missing', [meta.ref], { unit: 'bool' }),
    language: d.language ? ok(String(d.language), meta.ref) : unknown('no_data', 'no language', [meta.ref]),
    repo_created_at: typeof d.created_at === 'string' ? ok(d.created_at, meta.ref, { unit: 'date' }) : unknown('no_data', 'no created_at', [meta.ref]),
  };
}

/** Community fields from the legacy providers' results. A zero or a missing answer is unknown, never a low score. */
export function communityFields(raw: {
  symbol: string | null;
  lunar: { sentiment: number | null; social_dominance: number | null; trend: string | null; fetched_at?: string } | null;
  discordLinked: boolean;
  discordMembers: number | null;
  telegramLinked: boolean;
  telegramMembers: number | null;
}, nowIso: string): CommunityFacts {
  // A provider timestamp in the future is invalid provenance: the reading is dropped instead of being reused as fresh.
  const futureLunar = !!raw.lunar?.fetched_at && Date.parse(raw.lunar.fetched_at) > Date.parse(nowIso) + FUTURE_SKEW_MS;
  const input = { ...raw, lunar: futureLunar ? null : raw.lunar };
  // A cached LunarCrush answer keeps the time it was really obtained; a scan never renews it (Codex round 2, finding 8).
  const lc: SourceRef = { source: 'lunarcrush', fetched_at: input.lunar?.fetched_at ?? nowIso };
  const noLunar = (why: string) => unknown<any>(input.symbol ? 'no_data' : 'missing_input', why, [lc]);
  // A measured 0 is a reading (sentiment 0, dominance 0); only null/non-numeric/out-of-range is missing.
  const num = (v: number | null | undefined, what: string, max = 100): Field<number> =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max
      ? ok(v, lc, { confidence: 'medium' })
      : input.lunar ? unknown('no_data', `LunarCrush returned no ${what}`, [lc]) : noLunar(input.symbol ? 'LunarCrush returned nothing for this symbol' : 'no symbol to look up');
  const social = (linked: boolean, members: number | null, source: string): Field<number> => {
    const ref: SourceRef = { source, fetched_at: nowIso };
    if (!linked) return unknown('not_found', `no ${source.replace('_', ' ')} link listed for this token`, [ref], { unit: 'members' });
    return typeof members === 'number' && members > 0 ? ok(members, ref, { unit: 'members', confidence: 'medium' }) : unknown('provider_failed', `${source}: no member count returned`, [ref], { unit: 'members' });
  };
  return {
    sentiment: num(input.lunar?.sentiment, 'sentiment'),
    social_dominance: num(input.lunar?.social_dominance, 'social dominance'),
    trend: input.lunar?.trend === 'up' || input.lunar?.trend === 'down' || input.lunar?.trend === 'flat' ? ok(input.lunar.trend, lc, { confidence: 'medium' }) : input.lunar ? unknown('no_data', 'LunarCrush returned no trend', [lc]) : noLunar('LunarCrush returned nothing'),
    discord_members: social(input.discordLinked, input.discordMembers, 'discord'),
    telegram_members: social(input.telegramLinked, input.telegramMembers, 'apify_telegram'),
  };
}
