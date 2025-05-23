
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TokenActionsProps {
  showActions?: boolean;
  onClick?: () => void;
}

export default function TokenActions({ showActions = true, onClick }: TokenActionsProps) {
  if (!showActions || !onClick) return null;

  return (
    <Button size="sm" onClick={onClick} className="flex items-center gap-1">
      Select 
      <ArrowRight className="h-3 w-3" />
    </Button>
  );
}
