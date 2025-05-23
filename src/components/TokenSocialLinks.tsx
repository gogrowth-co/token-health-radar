
import { Globe, Twitter, Github } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TokenSocialLinksProps {
  website?: string;
  twitter?: string;
  github?: string;
}

export default function TokenSocialLinks({ website, twitter, github }: TokenSocialLinksProps) {
  // Always show website and twitter icons, only show github if it exists
  const hasAnyLinks = website || twitter || github;
  
  if (!hasAnyLinks) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-3">
      {/* Website - always show if any social data exists */}
      {website && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={website?.startsWith('http') ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-accent rounded"
              >
                <Globe className="h-5 w-5" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Official Website</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* Twitter - always show if any social data exists */}
      {twitter && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={twitter?.startsWith('http') ? twitter : `https://twitter.com/${twitter?.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-accent rounded"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Twitter/X</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {/* GitHub - only show if github URL exists */}
      {github && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={github.startsWith('http') ? github : `https://github.com/${github}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground transition-colors p-1 hover:bg-accent rounded"
              >
                <Github className="h-5 w-5" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>GitHub</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
