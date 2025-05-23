
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SearchErrorStateProps {
  error: string | null;
}

export default function SearchErrorState({ error }: SearchErrorStateProps) {
  const navigate = useNavigate();
  
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{error}</p>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => navigate("/")}
      >
        Try a different search
      </Button>
    </div>
  );
}
