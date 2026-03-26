import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, Activity, TrendingUp, Hash, MessageCircle, Lock } from "lucide-react";

interface CommunityData {
  sentiment?: number | null;
  socialDominance?: number | null;
  social_dominance?: number | null;
  trend?: string | null;
  discordMembers?: number | null;
  discord_members?: number | null;
  telegramMembers?: number | null;
  telegram_members?: number | null;
  // Legacy / paywalled fields
  galaxyScore?: number | null;
  galaxy_score?: number | null;
  altRank?: number | null;
  alt_rank?: number | null;
  score?: number;
}

interface CommunityCardProps {
  community: CommunityData;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '—';
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

export function CommunityCard({ community }: CommunityCardProps) {
  const sent = community.sentiment ?? null;
  const dom = community.socialDominance ?? community.social_dominance ?? null;
  const trend = community.trend ?? null;
  const discord = community.discordMembers ?? community.discord_members ?? null;
  const telegram = community.telegramMembers ?? community.telegram_members ?? null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Community
            </CardTitle>
            <CardDescription className="text-xs">Social Sentiment Data</CardDescription>
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
          {/* Sentiment */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Heart className="h-3 w-3" />
              Sentiment
            </div>
            <div className="font-semibold">
              {sent != null ? `${sent.toFixed(1)}%` : '—'}
            </div>
          </div>

          {/* Social Dominance */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              Social Dominance
            </div>
            <div className="font-semibold">
              {dom != null ? `${dom.toFixed(3)}%` : '—'}
            </div>
          </div>

          {/* Trend */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Activity className="h-3 w-3" />
              Trend
            </div>
            <div className="font-semibold">
              {trend === 'up' ? '↑ Rising' : trend === 'down' ? '↓ Falling' : trend === 'flat' ? '→ Stable' : '—'}
            </div>
          </div>

          {/* Discord */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Hash className="h-3 w-3" />
              Discord
            </div>
            <div className="font-semibold">
              {formatNumber(discord)}
            </div>
          </div>

          {/* Telegram */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MessageCircle className="h-3 w-3" />
              Telegram
            </div>
            <div className="font-semibold">
              {formatNumber(telegram)}
            </div>
          </div>
        </div>

        {/* Data source */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Badge variant="outline" className="text-xs">
            Powered by LunarCrush · Updated every 6h
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default CommunityCard;
