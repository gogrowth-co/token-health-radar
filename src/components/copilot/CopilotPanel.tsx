import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, AlertTriangle, Clock, Bot, User } from "lucide-react";
import MetricCards from "./blocks/MetricCards";
import PriceSparkline from "./blocks/PriceSparkline";
import PoolsTable from "./blocks/PoolsTable";
import CategoryTags from "./blocks/CategoryTags";
import HoldersTable from "./blocks/HoldersTable";
import { ChangeCard } from "./blocks/ChangeCard";

interface CopilotPanelProps {
  token: {
    chain: string;
    address: string;
    coingeckoId?: string;
    symbol: string;
  };
  standalone?: boolean;
}

type IntentType = 'price' | 'chart' | 'pools' | 'metadata' | 'summary' | 'holders' | 'unknown';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  data?: {
    price?: {
      usd: number;
      change24hPct: number;
      mcap: number | null;
      change30dPct?: number | null;
    };
    change?: {
      window: string;
      pct: number;
      from: number;
      to: number;
    };
    sparkline?: Array<{
      t: number;
      v: number;
    }>;
    topPools?: Array<{
      name: string;
      dex: string;
      liquidityUsd: number;
      vol24hUsd: number;
      ageDays: number;
    }>;
    categories?: string[];
    holders?: {
      totalHolders: number;
      topHolders: Array<{
        address: string;
        percentage: number;
        balance?: number;
      }>;
      top10Percentage: number;
      concentrationRisk: string;
      giniCoefficient?: number;
    };
  };
  available?: string[];
  limited?: boolean;
  errors?: string[];
  intent?: IntentType;
  timestamp: Date;
}

export default function CopilotPanel({ token, standalone = false }: CopilotPanelProps) {
  const [loading, setLoading] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connection status and greeting message on mount
  useEffect(() => {
    // Simulate MCP connection
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);

    // Add greeting message
    setMessages([{
      role: 'assistant',
      text: 'Ask me about this token. Powered by CoinGecko MCP.',
      timestamp: new Date()
    }]);
  }, []);


  const handleSendMessage = async () => {
    if (!currentInput.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: currentInput,
      timestamp: new Date()
    };

    const typingMessage: ChatMessage = {
      role: 'assistant',
      text: 'Thinking...',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, typingMessage]);
    setCurrentInput('');
    setLoading(true);

    try {
      // Get last 8 messages for context (4 turns)
      const recentMessages = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.text
      }));

      recentMessages.push({ role: 'user', content: userMessage.text });

      const { data, error: funcError } = await supabase.functions.invoke('mcp-chat', {
        body: {
          messages: recentMessages,
          token: {
            chain: token.chain,
            address: token.address,
            coingeckoId: token.coingeckoId || token.symbol.toLowerCase()
          },
          mode: 'chat'
        }
      });

      if (funcError) {
        console.error('[COPILOT] Function error:', funcError);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          text: `Request failed: ${funcError.message}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        return;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        text: data.text || 'No response text available',
        data: data.data,
        available: data.available,
        limited: data.limited,
        errors: data.errors,
        intent: data.intent,
        timestamp: new Date()
      };

      // Replace the typing indicator with actual response
      setMessages(prev => [...prev.slice(0, -1), assistantMessage]);

    } catch (err) {
      console.error('[COPILOT] Request failed:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        text: err instanceof Error ? err.message : 'Request failed',
        timestamp: new Date()
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageBubble = (message: ChatMessage) => (
    <div key={message.timestamp.getTime()} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        {message.role === 'user' ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      
      <div className={`flex-1 space-y-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block rounded-lg p-3 max-w-[80%] ${
          message.role === 'user' 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        </div>

        {/* Render data blocks for assistant messages based on intent */}
        {message.role === 'assistant' && message.data && (
          <div className="space-y-3 max-w-full">
            {message.limited && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Public MCP is rate-limited. Showing partial data.
                </AlertDescription>
              </Alert>
            )}

            {/* Change card: show for chart and summary intents */}
            {message.data.change && 
              (message.intent === 'chart' || message.intent === 'summary') && (
              <ChangeCard change={message.data.change} />
            )}

            {/* Price metrics: show for price, chart, pools, holders, and summary intents */}
            {message.data.price && 
              (message.intent === 'price' || message.intent === 'chart' || 
               message.intent === 'pools' || message.intent === 'holders' || 
               message.intent === 'summary') && (
              <MetricCards price={message.data.price} />
            )}

            {/* Sparkline: show for chart and summary intents */}
            {message.data.sparkline && 
              (message.intent === 'chart' || message.intent === 'summary') && (
              <PriceSparkline 
                ohlc={message.data.sparkline.map(point => ({
                  t: point.t,
                  o: point.v,
                  h: point.v,
                  l: point.v,
                  c: point.v
                }))}
                window={message.data.change?.window}
              />
            )}

            {/* Pools table: show ONLY for pools and summary intents */}
            {message.data.topPools && message.data.topPools.length > 0 && 
              (message.intent === 'pools' || message.intent === 'summary') && (
              <PoolsTable pools={message.data.topPools} />
            )}

            {/* Categories: show for metadata and summary intents */}
            {message.data.categories && message.data.categories.length > 0 && 
              (message.intent === 'metadata' || message.intent === 'summary') && (
              <CategoryTags categories={message.data.categories} />
            )}

            {/* Holders: show for holders and summary intents */}
            {message.data.holders && 
              (message.intent === 'holders' || message.intent === 'summary') && (
              <HoldersTable holders={message.data.holders} />
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );

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

      <CardContent className="space-y-4 p-0">
        {/* Messages Area */}
        <ScrollArea className={`${standalone ? 'h-[500px]' : 'h-96'} px-6 pt-6`}>
          <div className="space-y-4">
            {messages.map(renderMessageBubble)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Section */}
        <div className="border-t px-6 py-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Ask about price, 7d trend, or top pools..."
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="min-h-[60px] max-h-[120px] resize-none"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shift+Enter for new line, Enter to send
              </p>
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={loading || !currentInput.trim()}
              size="sm"
              className="mb-6"
            >
              {loading ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Ask
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}