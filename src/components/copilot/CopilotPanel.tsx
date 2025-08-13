import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Send, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import MetricCards from "./blocks/MetricCards";
import PriceSparkline from "./blocks/PriceSparkline";
import PoolsTable from "./blocks/PoolsTable";
import CategoryTags from "./blocks/CategoryTags";

interface CopilotPanelProps {
  token: {
    chain: string;
    address: string;
    coingeckoId?: string;
    symbol: string;
  };
}

interface McpResponse {
  source: "coingecko-mcp";
  available: string[];
  price?: {
    usd: number;
    change24hPct: number;
    mcap: number;
  };
  ohlc?: Array<{
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
  }>;
  topPools?: Array<{
    name: string;
    dex: string;
    liquidityUsd: number;
    vol24hUsd: number;
    ageDays: number;
  }>;
  categories?: string[];
  limited: boolean;
  errors: string[];
}

interface QueryHistory {
  query: string;
  response: McpResponse;
  timestamp: Date;
}

export default function CopilotPanel({ token }: CopilotPanelProps) {
  const [loading, setLoading] = useState(false);
  const [autoInsightsLoading, setAutoInsightsLoading] = useState(true);
  const [currentQuery, setCurrentQuery] = useState("");
  const [currentResponse, setCurrentResponse] = useState<McpResponse | null>(null);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Auto-load insights and connection status on mount
  useEffect(() => {
    // Simulate MCP connection
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);

    if (token.coingeckoId) {
      handleQuery("auto_insights", true);
    } else {
      setAutoInsightsLoading(false);
      setError("CoinGecko ID not available for this token");
    }
  }, [token.coingeckoId]);

  const handleQuery = async (query: string, isAutoInsights: boolean = false) => {
    if (!query.trim() && !isAutoInsights) return;
    
    const queryToSend = query || "auto_insights";
    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('mcp-chat', {
        body: {
          query: queryToSend,
          token: {
            chain: token.chain,
            address: token.address,
            coingeckoId: token.coingeckoId || token.symbol.toLowerCase()
          }
        }
      });

      if (funcError) {
        console.error('[COPILOT] Function error:', funcError);
        setError(`Request failed: ${funcError.message}`);
        return;
      }

      const response = data;
      // Transform the new API response to match existing interface
      const mcpResponse: McpResponse = {
        source: "coingecko-mcp" as const,
        available: Object.keys(response.data || {}),
        price: response.data?.price,
        ohlc: response.data?.sparkline?.map((point: any) => ({
          t: point.t,
          o: point.v,
          h: point.v,
          l: point.v,
          c: point.v
        })),
        topPools: response.data?.topPools,
        categories: response.data?.categories,
        limited: response.limited || false,
        errors: response.errors || []
      };
      setCurrentResponse(mcpResponse);

      // Add to history (limit to 3 items)
      if (!isAutoInsights) {
        setHistory(prev => [
          { query: queryToSend, response: mcpResponse, timestamp: new Date() },
          ...prev.slice(0, 2)
        ]);
        setCurrentQuery(""); // Clear input
      }

      if (mcpResponse.errors.length > 0) {
        console.warn('[COPILOT] Response errors:', mcpResponse.errors);
      }

    } catch (err) {
      console.error('[COPILOT] Request failed:', err);
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
      if (isAutoInsights) {
        setAutoInsightsLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentQuery.trim() && !loading) {
      handleQuery(currentQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Copilot (CoinGecko MCP)</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant={connectionStatus === 'connected' ? 'default' : 'outline'} 
                  className="text-xs"
                >
                  {connectionStatus === 'connecting' && (
                    <>
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      Connecting CoinGecko...
                    </>
                  )}
                  {connectionStatus === 'connected' && (
                    <>Live via MCP</>
                  )}
                  {connectionStatus === 'error' && (
                    <>Connection Error</>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Status of CoinGecko MCP connection</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Section */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Ask about price, 7d trend, or top pools..."
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={loading || !currentQuery.trim()}
            size="sm"
          >
            {loading ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Ask
          </Button>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Rate Limited Banner */}
        {currentResponse?.limited && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Public MCP is rate-limited. Showing partial data.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Response */}
        {(currentResponse || autoInsightsLoading) && (
          <div className="space-y-4" aria-live="polite">
            {/* Metrics */}
            {(currentResponse?.available.includes('price') || autoInsightsLoading) && (
              <div>
                <MetricCards 
                  price={currentResponse?.price} 
                  loading={autoInsightsLoading}
                />
              </div>
            )}

            {/* Price Chart */}
            {(currentResponse?.available.includes('ohlc') || autoInsightsLoading) && (
              <div>
                <PriceSparkline 
                  ohlc={currentResponse?.ohlc} 
                  loading={autoInsightsLoading}
                />
              </div>
            )}

            {/* Pools */}
            {(currentResponse?.available.includes('topPools') || autoInsightsLoading) && (
              <div>
                <PoolsTable 
                  pools={currentResponse?.topPools} 
                  loading={autoInsightsLoading}
                />
              </div>
            )}

            {/* Categories */}
            {(currentResponse?.available.includes('categories') || autoInsightsLoading) && (
              <div>
                <CategoryTags 
                  categories={currentResponse?.categories} 
                  loading={autoInsightsLoading}
                />
              </div>
            )}
          </div>
        )}

        {/* Historical Queries */}
        {history.length > 0 && (
          <div className="space-y-3">
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Recent Queries
              </h4>
              {history.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">"{item.query}"</span>
                    <span className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Available: {item.response.available.join(', ') || 'None'}
                    {item.response.errors.length > 0 && (
                      <span className="text-red-500 ml-2">
                        ({item.response.errors.length} error{item.response.errors.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!autoInsightsLoading && !currentResponse && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No data loaded yet</p>
            <p className="text-xs mt-1">Try asking for price data or market insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}