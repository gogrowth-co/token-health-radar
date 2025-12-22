import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, GitCommit, Users, Star, GitFork, Clock, ExternalLink, Archive } from "lucide-react";

interface DevelopmentData {
  repoName: string | null;
  repoUrl?: string | null;
  commits30d: number | null;
  contributors: number | null;
  stars: number | null;
  forks: number | null;
  openIssues?: number | null;
  lastCommitDate: string | null;
  language?: string | null;
  isArchived?: boolean;
  score?: number;
}

interface DevelopmentCardProps {
  development: DevelopmentData;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getActivityLevel(commits30d: number | null): { level: string; color: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (commits30d === null) return { level: 'Unknown', color: 'outline' };
  if (commits30d >= 50) return { level: 'Very Active', color: 'default' };
  if (commits30d >= 20) return { level: 'Active', color: 'default' };
  if (commits30d >= 5) return { level: 'Moderate', color: 'secondary' };
  if (commits30d >= 1) return { level: 'Low', color: 'secondary' };
  return { level: 'Inactive', color: 'destructive' };
}

export function DevelopmentCard({ development }: DevelopmentCardProps) {
  const activity = getActivityLevel(development.commits30d);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Development
            </CardTitle>
            <CardDescription className="text-xs">GitHub Activity & Team</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {development.score !== undefined && (
              <Badge variant={development.score >= 70 ? "default" : development.score >= 40 ? "secondary" : "destructive"}>
                Score: {development.score}
              </Badge>
            )}
            <Badge variant={activity.color}>
              {activity.level}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Repo Info */}
        {development.repoName && (
          <div className="flex items-center justify-between mb-4 pb-3 border-b">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{development.repoName}</span>
              {development.isArchived && (
                <Badge variant="outline" className="text-xs">
                  <Archive className="h-3 w-3 mr-1" />
                  Archived
                </Badge>
              )}
              {development.language && (
                <Badge variant="secondary" className="text-xs">
                  {development.language}
                </Badge>
              )}
            </div>
            {development.repoUrl && (
              <a 
                href={development.repoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {/* Commits */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <GitCommit className="h-3 w-3" />
              Commits (30d)
            </div>
            <div className="font-semibold">
              {development.commits30d !== null ? development.commits30d : 'N/A'}
            </div>
          </div>

          {/* Contributors */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Users className="h-3 w-3" />
              Contributors
            </div>
            <div className="font-semibold">
              {development.contributors !== null ? development.contributors : 'N/A'}
            </div>
          </div>

          {/* Stars */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Star className="h-3 w-3" />
              Stars
            </div>
            <div className="font-semibold">
              {development.stars !== null ? development.stars.toLocaleString() : 'N/A'}
            </div>
          </div>

          {/* Forks */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <GitFork className="h-3 w-3" />
              Forks
            </div>
            <div className="font-semibold">
              {development.forks !== null ? development.forks.toLocaleString() : 'N/A'}
            </div>
          </div>

          {/* Open Issues */}
          {development.openIssues !== undefined && development.openIssues !== null && (
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">Open Issues</div>
              <div className="font-medium">{development.openIssues}</div>
            </div>
          )}

          {/* Last Commit */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="h-3 w-3" />
              Last Commit
            </div>
            <div className="font-semibold">
              {formatDate(development.lastCommitDate)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DevelopmentCard;
