import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SolanaBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Solana chain badge component for visual identification
 * Uses purple/violet theme matching Solana's branding
 */
export function SolanaBadge({ className, size = "md" }: SolanaBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5"
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "bg-purple-500/20 text-purple-400 border-purple-500/30 font-medium",
        sizeClasses[size],
        className
      )}
    >
      <span className="mr-1">◎</span> SOL
    </Badge>
  );
}

export default SolanaBadge;
