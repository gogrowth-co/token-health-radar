// MCP Configuration for CoinGecko integration
export const getMcpEndpoint = () => {
  // For now, always use keyless mode. Can be enhanced later with environment variables
  return 'https://mcp.api.coingecko.com/sse';
};

export const isMcpEnabled = () => {
  // For now, enable in production. Can be controlled via environment variable later
  return true;
};

export const getMcpConfig = () => {
  return {
    enabled: isMcpEnabled(),
    endpoint: getMcpEndpoint(),
    timeout: 6000, // 6 second timeout as specified
    maxRetries: 1,
  };
};