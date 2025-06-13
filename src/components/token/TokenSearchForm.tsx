
import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface TokenSearchFormProps {
  initialSearchTerm: string;
  onSearch: (searchTerm: string) => void;
}

export default function TokenSearchForm({ initialSearchTerm, onSearch }: TokenSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error("Empty search", {
        description: "Please enter a token name"
      });
      return;
    }
    
    onSearch(searchTerm);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search token name"
            className="pl-9"
          />
        </div>
      </form>
      <p className="text-xs text-muted-foreground mt-1">
        EVM tokens only
      </p>
    </div>
  );
}
