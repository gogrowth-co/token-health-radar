
import { Loader2 } from "lucide-react";

export default function SearchLoadingState() {
  return (
    <div className="flex justify-center py-12">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Searching for tokens...</p>
      </div>
    </div>
  );
}
