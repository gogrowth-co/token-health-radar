

## Fix: Helmet `<title>` expects a plain string

### Problem
On `/agent-scan/:chain/:agentId`, the `<title>` tag in `<Helmet>` uses inline JSX expressions:
```tsx
<title>{scanData.agent.name} Trust Score — {result.overallScore}/100 | Token Health Scan</title>
```
Helmet treats each `{}` interpolation as a separate child node, not a single string. It throws an error requiring a single string child.

### Fix
Wrap the entire title in a single template literal:
```tsx
<title>{`${scanData.agent.name} Trust Score — ${result.overallScore}/100 | Token Health Scan`}</title>
```

### File
- `src/pages/AgentScanResult.tsx` — line 102: change to a single template literal expression.

One-line fix, no other files affected.

