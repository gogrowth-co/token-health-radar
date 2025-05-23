
import { ExternalLink, Twitter, Github, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TokenSocialLinksProps {
  website?: string;
  twitter?: string;
  github?: string;
}

export default function TokenSocialLinks({ website, twitter, github }: TokenSocialLinksProps) {
  return (
    <div className="flex items-center gap-3 ml-auto">
      {/* Website - always show */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a 
              href={website?.startsWith('http') ? website : `https://${website || 'example.com'}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-5 w-5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Official Website</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Twitter - always show */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a 
              href={twitter?.startsWith('http') ? twitter : `https://twitter.com/${twitter?.replace('@', '') || 'twitter'}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Twitter className="h-5 w-5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>Twitter/X</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* GitHub - only if available */}
      {github && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a 
                href={github.startsWith('http') ? github : `https://github.com/${github}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-muted-foreground hover:text-foreground transition-colors"
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
