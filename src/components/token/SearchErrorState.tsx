
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";

interface SearchErrorStateProps {
  error: string | null;
}

export default function SearchErrorState({ error }: SearchErrorStateProps) {
  const navigate = useNavigate();
  
  const handleRetry = () => {
    window.location.reload();
  };
  
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Search Error</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">{error}</p>
      <div className="flex gap-2 justify-center">
        <Button 
          variant="outline" 
          onClick={handleRetry}
          className="min-w-[120px]"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate("/")}
        >
          New Search
        </Button>
      </div>
    </div>
  );
}
