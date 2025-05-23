
import { ExternalLink, Twitter, Github, Link as LinkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TokenSocialLinksProps {
  website?: string;
  twitter?: string;
  github?: string;
}

export default function TokenSocialLinks({ website, twitter, github }: TokenSocialLinksProps) {
  if (!website && !twitter && !github) return null;

  return (
    <div className="flex items-center gap-3">
      {website && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={website.startsWith('http') ? website : `https://${website}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground"
              >
                <LinkIcon className="h-4 w-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Website</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {twitter && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>Twitter</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {github && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={github.startsWith('http') ? github : `https://github.com/${github}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground"
              >
                <Github className="h-4 w-4" />
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
