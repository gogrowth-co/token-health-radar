import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Heart, Activity, Award, Hash, MessageCircle } from "lucide-react";

interface CommunityData {
  galaxyScore: number | null;
  sentiment: number | null;
  contributorsActive: number | null;
  interactions24h: number | null;
  altRank: number | null;
  discordMembers: number | null;
  telegramMembers: number | null;
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Community
            </CardTitle>
            <CardDescription className="text-xs">Social Metrics via LunarCrush</CardDescription>
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
          {/* Galaxy Score */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Star className="h-3 w-3" />
              Galaxy Score
            </div>
            <div className="font-semibold">
              {community.galaxyScore != null ? community.galaxyScore : '—'}
            </div>
          </div>

          {/* Sentiment */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Heart className="h-3 w-3" />
              Sentiment
            </div>
            <div className="font-semibold">
              {community.sentiment != null ? `${community.sentiment.toFixed(1)}%` : '—'}
            </div>
          </div>

          {/* Active Creators */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Users className="h-3 w-3" />
              Active Creators
            </div>
            <div className="font-semibold">
              {formatNumber(community.contributorsActive)}
            </div>
          </div>

          {/* Daily Engagements */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Activity className="h-3 w-3" />
              Engagements (24h)
            </div>
            <div className="font-semibold">
              {formatNumber(community.interactions24h)}
            </div>
          </div>

          {/* AltRank */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Award className="h-3 w-3" />
              AltRank
            </div>
            <div className="font-semibold">
              {community.altRank != null ? `#${community.altRank}` : '—'}
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
        </div>

        {/* Data source */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Badge variant="outline" className="text-xs">
            LunarCrush · Updated every 6h
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default CommunityCard;
