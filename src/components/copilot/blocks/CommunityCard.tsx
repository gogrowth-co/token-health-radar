import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Twitter, MessageCircle, Hash, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";

interface CommunityData {
  twitterFollowers: number | null;
  twitterVerified?: boolean;
  twitterGrowth7d?: number | null;
  discordMembers: number | null;
  telegramMembers: number | null;
  score?: number;
}

interface CommunityCardProps {
  community: CommunityData;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

export function CommunityCard({ community }: CommunityCardProps) {
  const hasTwitter = community.twitterFollowers !== null;
  const hasDiscord = community.discordMembers !== null;
  const hasTelegram = community.telegramMembers !== null;
  
  // Calculate total reach
  const totalReach = (community.twitterFollowers || 0) + 
                     (community.discordMembers || 0) + 
                     (community.telegramMembers || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Community
            </CardTitle>
            <CardDescription className="text-xs">Social Metrics & Engagement</CardDescription>
          </div>
          {community.score !== undefined && (
            <Badge variant={community.score >= 70 ? "default" : community.score >= 40 ? "secondary" : "destructive"}>
              Score: {community.score}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {/* Twitter */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Twitter className="h-3 w-3" />
              Twitter
              {community.twitterVerified && (
                <CheckCircle className="h-3 w-3 text-blue-500" />
              )}
            </div>
            <div className="font-semibold flex items-center gap-2">
              {formatNumber(community.twitterFollowers)}
              {community.twitterGrowth7d !== null && community.twitterGrowth7d !== undefined && (
                <span className={`text-xs flex items-center ${community.twitterGrowth7d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {community.twitterGrowth7d >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {community.twitterGrowth7d.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Discord */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Hash className="h-3 w-3" />
              Discord
            </div>
            <div className="font-semibold">
              {formatNumber(community.discordMembers)}
            </div>
          </div>

          {/* Telegram */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MessageCircle className="h-3 w-3" />
              Telegram
            </div>
            <div className="font-semibold">
              {formatNumber(community.telegramMembers)}
            </div>
          </div>

          {/* Total Reach */}
          {totalReach > 0 && (
            <div className="space-y-1 col-span-2 md:col-span-3">
              <div className="text-muted-foreground text-xs">Total Reach</div>
              <div className="font-medium text-lg">{formatNumber(totalReach)}</div>
            </div>
          )}
        </div>

        {/* Platform availability indicators */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Badge variant={hasTwitter ? "default" : "outline"} className="text-xs">
            <Twitter className="h-3 w-3 mr-1" />
            {hasTwitter ? 'Active' : 'No data'}
          </Badge>
          <Badge variant={hasDiscord ? "default" : "outline"} className="text-xs">
            <Hash className="h-3 w-3 mr-1" />
            {hasDiscord ? 'Active' : 'No data'}
          </Badge>
          <Badge variant={hasTelegram ? "default" : "outline"} className="text-xs">
            <MessageCircle className="h-3 w-3 mr-1" />
            {hasTelegram ? 'Active' : 'No data'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default CommunityCard;
