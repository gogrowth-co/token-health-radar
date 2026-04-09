/**
 * Agent Trust Score — Scoring Engine
 * 
 * Pure function that calculates a 0-100 trust score across 5 dimensions
 * for ERC-8004 AI agents. No side effects, no imports except types.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface CheckResult {
  name: string;
  passed: boolean;
  partial?: boolean;
  value?: string | number | boolean | null;
  recommendation?: string;
  priority?: "high" | "medium" | "low";
}

export interface DimensionScore {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  checks: CheckResult[];
  icon: string; // lucide icon name
}

export interface AgentTrustResult {
  overallScore: number;
  label: string;
  color: string;
  colorClass: string;
  dimensions: DimensionScore[];
  actionPlan: CheckResult[];
  crossSell: {
    hasTokenAddress: boolean;
    tokenAddress?: string;
    chain?: string;
  };
}

export interface AgentScanData {
  agent: {
    name: string;
    agentId: string;
    chain: string;
    owner?: string;
    description?: string;
    serviceTypes?: string[];
    registrationDate?: string;
    tokenAddress?: string;
  };
  onchainData: {
    isRegistered: boolean;
    hasOwner: boolean;
    hasDescription: boolean;
    hasServiceEndpoints: boolean;
    endpointCount: number;
    hasMetadata: boolean;
    registryVerified: boolean;
    serviceTypes: string[];
  };
  offchainData: {
    tokuListed: boolean;
    tokuRating?: number;
    tokuJobCount?: number;
    tokuServices?: string[];
    websiteReachable?: boolean;
    socialPresence?: boolean;
    documentationUrl?: string;
  } | null;
  endpointHealth: {
    endpoints: Array<{
      url: string;
      isReachable: boolean;
      responseTimeMs?: number;
      statusCode?: number;
    }>;
    avgResponseTime?: number;
    allReachable: boolean;
  };
  metadata: {
    fetchedAt: string;
    source: string;
  };
}

// ─── Trust Levels ────────────────────────────────────────────────────

const TRUST_LEVELS = [
  { min: 80, label: "Highly Trusted", color: "#10b981", colorClass: "text-green-500" },
  { min: 60, label: "Moderately Trusted", color: "#14b8a6", colorClass: "text-teal-500" },
  { min: 40, label: "Use Caution", color: "#f59e0b", colorClass: "text-amber-500" },
  { min: 20, label: "Low Trust", color: "#f97316", colorClass: "text-orange-500" },
  { min: 0, label: "Unverified", color: "#ef4444", colorClass: "text-red-500" },
] as const;

function getTrustLevel(score: number) {
  for (const level of TRUST_LEVELS) {
    if (score >= level.min) return level;
  }
  return TRUST_LEVELS[TRUST_LEVELS.length - 1];
}

// ─── Dimension Scorers ───────────────────────────────────────────────

function scoreIdentity(data: AgentScanData): DimensionScore {
  const checks: CheckResult[] = [];
  let score = 0;

  // Registered on ERC-8004 (30 pts)
  const isRegistered = data.onchainData.isRegistered;
  checks.push({
    name: "Registered on ERC-8004 registry",
    passed: isRegistered,
    value: isRegistered,
    recommendation: isRegistered ? undefined : "Register agent on the ERC-8004 onchain registry",
    priority: "high",
  });
  if (isRegistered) score += 30;

  // Has owner address (20 pts)
  const hasOwner = data.onchainData.hasOwner;
  checks.push({
    name: "Owner address on record",
    passed: hasOwner,
    value: data.agent.owner || null,
    recommendation: hasOwner ? undefined : "Set an owner address for accountability",
    priority: "high",
  });
  if (hasOwner) score += 20;

  // Has description (15 pts)
  const hasDesc = data.onchainData.hasDescription;
  checks.push({
    name: "Agent description provided",
    passed: hasDesc,
    value: hasDesc,
    recommendation: hasDesc ? undefined : "Add a clear description of agent purpose",
    priority: "medium",
  });
  if (hasDesc) score += 15;

  // Has metadata (15 pts)
  const hasMeta = data.onchainData.hasMetadata;
  checks.push({
    name: "Metadata available",
    passed: hasMeta,
    value: hasMeta,
    recommendation: hasMeta ? undefined : "Publish agent metadata for transparency",
    priority: "medium",
  });
  if (hasMeta) score += 15;

  // Registry verified (20 pts)
  const verified = data.onchainData.registryVerified;
  checks.push({
    name: "Registry verification status",
    passed: verified,
    value: verified,
    recommendation: verified ? undefined : "Complete registry verification process",
    priority: "medium",
  });
  if (verified) score += 20;

  return { key: "identity", label: "Identity Verification", score, maxScore: 100, checks, icon: "Shield" };
}

function scoreFinancial(data: AgentScanData): DimensionScore {
  const checks: CheckResult[] = [];
  let score = 0;

  // Has token address linked (25 pts)
  const hasToken = !!data.agent.tokenAddress;
  checks.push({
    name: "Token address linked",
    passed: hasToken,
    value: data.agent.tokenAddress || null,
    recommendation: hasToken ? undefined : "Link a token address for financial transparency",
    priority: "medium",
  });
  if (hasToken) score += 25;

  // Listed on Toku marketplace (25 pts)
  const tokuListed = data.offchainData?.tokuListed ?? false;
  checks.push({
    name: "Listed on Toku marketplace",
    passed: tokuListed,
    value: tokuListed,
    recommendation: tokuListed ? undefined : "List your agent on toku.agency for discoverability",
    priority: "low",
  });
  if (tokuListed) score += 25;

  // Has pricing/jobs listed (25 pts)
  const hasJobs = (data.offchainData?.tokuJobCount ?? 0) > 0;
  checks.push({
    name: "Services or jobs listed",
    passed: hasJobs,
    value: data.offchainData?.tokuJobCount ?? 0,
    recommendation: hasJobs ? undefined : "Publish available services with pricing",
    priority: "low",
  });
  if (hasJobs) score += 25;

  // Toku rating (25 pts)
  const rating = data.offchainData?.tokuRating;
  const hasRating = rating != null && rating > 0;
  checks.push({
    name: "Marketplace rating",
    passed: hasRating,
    partial: hasRating && rating < 4,
    value: rating ?? null,
    recommendation: hasRating ? undefined : "Earn ratings through successful service delivery",
    priority: "low",
  });
  if (hasRating) {
    score += rating >= 4 ? 25 : rating >= 3 ? 15 : 8;
  }

  return { key: "financial", label: "Financial Transparency", score, maxScore: 100, checks, icon: "DollarSign" };
}

function scoreOperational(data: AgentScanData): DimensionScore {
  const checks: CheckResult[] = [];
  let score = 0;

  // Has service endpoints (25 pts)
  const hasEndpoints = data.onchainData.hasServiceEndpoints;
  checks.push({
    name: "Service endpoints registered",
    passed: hasEndpoints,
    value: data.onchainData.endpointCount,
    recommendation: hasEndpoints ? undefined : "Register at least one service endpoint",
    priority: "high",
  });
  if (hasEndpoints) score += 25;

  // Endpoints reachable (30 pts)
  const endpointCount = data.endpointHealth.endpoints.length;
  const reachableCount = data.endpointHealth.endpoints.filter(e => e.isReachable).length;
  const allReachable = data.endpointHealth.allReachable && endpointCount > 0;
  checks.push({
    name: "All endpoints reachable",
    passed: allReachable,
    partial: reachableCount > 0 && !allReachable,
    value: endpointCount > 0 ? `${reachableCount}/${endpointCount}` : "No endpoints",
    recommendation: allReachable ? undefined : "Ensure all registered endpoints respond to requests",
    priority: "high",
  });
  if (allReachable) score += 30;
  else if (reachableCount > 0) score += Math.round(30 * (reachableCount / endpointCount));

  // Response time (25 pts)
  const avgTime = data.endpointHealth.avgResponseTime;
  const fastResponse = avgTime != null && avgTime < 2000;
  const okResponse = avgTime != null && avgTime < 5000;
  checks.push({
    name: "Response time under 2s",
    passed: fastResponse,
    partial: okResponse && !fastResponse,
    value: avgTime != null ? `${avgTime}ms` : "N/A",
    recommendation: fastResponse ? undefined : "Optimize endpoint response time to under 2 seconds",
    priority: "medium",
  });
  if (fastResponse) score += 25;
  else if (okResponse) score += 15;

  // Multiple service types (20 pts)
  const serviceCount = data.onchainData.serviceTypes.length;
  const multiService = serviceCount >= 2;
  checks.push({
    name: "Multiple service types offered",
    passed: multiService,
    partial: serviceCount === 1,
    value: serviceCount,
    recommendation: multiService ? undefined : "Offer multiple service types to demonstrate capability",
    priority: "low",
  });
  if (multiService) score += 20;
  else if (serviceCount === 1) score += 10;

  return { key: "operational", label: "Operational Reliability", score, maxScore: 100, checks, icon: "Activity" };
}

function scoreReputation(data: AgentScanData): DimensionScore {
  const checks: CheckResult[] = [];
  let score = 0;

  // Toku marketplace presence (30 pts)
  const tokuListed = data.offchainData?.tokuListed ?? false;
  checks.push({
    name: "Marketplace presence",
    passed: tokuListed,
    value: tokuListed,
    recommendation: tokuListed ? undefined : "Establish presence on agent marketplaces",
    priority: "medium",
  });
  if (tokuListed) score += 30;

  // Rating score (30 pts)
  const rating = data.offchainData?.tokuRating;
  const goodRating = rating != null && rating >= 4;
  checks.push({
    name: "High marketplace rating (4+)",
    passed: goodRating,
    partial: rating != null && rating >= 3 && rating < 4,
    value: rating ?? null,
    recommendation: goodRating ? undefined : "Maintain high service quality to improve ratings",
    priority: "medium",
  });
  if (goodRating) score += 30;
  else if (rating != null && rating >= 3) score += 18;
  else if (rating != null && rating > 0) score += 8;

  // Social / web presence (20 pts)
  const hasSocial = data.offchainData?.socialPresence ?? false;
  checks.push({
    name: "Social or web presence",
    passed: hasSocial,
    value: hasSocial,
    recommendation: hasSocial ? undefined : "Create a website or social media presence",
    priority: "low",
  });
  if (hasSocial) score += 20;

  // Documentation available (20 pts)
  const hasDocs = !!data.offchainData?.documentationUrl;
  checks.push({
    name: "Documentation available",
    passed: hasDocs,
    value: data.offchainData?.documentationUrl || null,
    recommendation: hasDocs ? undefined : "Publish technical documentation for your agent",
    priority: "low",
  });
  if (hasDocs) score += 20;

  return { key: "reputation", label: "Reputation", score, maxScore: 100, checks, icon: "Star" };
}

function scoreCompliance(data: AgentScanData): DimensionScore {
  const checks: CheckResult[] = [];
  let score = 0;

  // ERC-8004 registration (35 pts)
  const registered = data.onchainData.isRegistered;
  checks.push({
    name: "ERC-8004 standard compliance",
    passed: registered,
    value: registered,
    recommendation: registered ? undefined : "Register with the ERC-8004 standard for compliance",
    priority: "high",
  });
  if (registered) score += 35;

  // Has service type classification (25 pts)
  const hasTypes = data.onchainData.serviceTypes.length > 0;
  checks.push({
    name: "Service type classification",
    passed: hasTypes,
    value: data.onchainData.serviceTypes.join(", ") || "None",
    recommendation: hasTypes ? undefined : "Classify your agent's service types properly",
    priority: "medium",
  });
  if (hasTypes) score += 25;

  // Description meets minimum standard (20 pts)
  const descLen = data.agent.description?.length ?? 0;
  const goodDesc = descLen >= 50;
  checks.push({
    name: "Description meets minimum standard",
    passed: goodDesc,
    partial: descLen > 0 && descLen < 50,
    value: `${descLen} characters`,
    recommendation: goodDesc ? undefined : "Provide a detailed description (50+ characters)",
    priority: "medium",
  });
  if (goodDesc) score += 20;
  else if (descLen > 0) score += 8;

  // Endpoint disclosure (20 pts)
  const disclosed = data.onchainData.endpointCount > 0;
  checks.push({
    name: "Endpoint disclosure",
    passed: disclosed,
    value: data.onchainData.endpointCount,
    recommendation: disclosed ? undefined : "Disclose service endpoints for auditability",
    priority: "medium",
  });
  if (disclosed) score += 20;

  return { key: "compliance", label: "Compliance", score, maxScore: 100, checks, icon: "UserCheck" };
}

// ─── Main Scoring Function ──────────────────────────────────────────

export function calculateAgentTrustScore(data: AgentScanData): AgentTrustResult {
  const dimensions = [
    scoreIdentity(data),
    scoreFinancial(data),
    scoreOperational(data),
    scoreReputation(data),
    scoreCompliance(data),
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );

  const level = getTrustLevel(overallScore);

  // Build action plan from failed/partial checks, sorted by priority
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const actionPlan = dimensions
    .flatMap(d => d.checks)
    .filter(c => !c.passed)
    .sort((a, b) => (priorityOrder[a.priority || "low"] ?? 2) - (priorityOrder[b.priority || "low"] ?? 2));

  return {
    overallScore,
    label: level.label,
    color: level.color,
    colorClass: level.colorClass,
    dimensions,
    actionPlan,
    crossSell: {
      hasTokenAddress: !!data.agent.tokenAddress,
      tokenAddress: data.agent.tokenAddress,
      chain: data.agent.chain,
    },
  };
}
