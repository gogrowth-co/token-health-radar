import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface AgentSearchInputProps {
  large?: boolean;
}

const CHAINS = [
  { value: "base", label: "Base" },
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
];

export default function AgentSearchInput({ large }: AgentSearchInputProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [chain, setChain] = useState("base");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    // If query looks like a numeric ID, go directly to scan result
    if (/^\d+$/.test(query.trim())) {
      navigate(`/agent-scan/${chain}/${query.trim()}`);
    } else {
      navigate(`/agent-scan/search?q=${encodeURIComponent(query.trim())}&chain=${chain}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <Select value={chain} onValueChange={setChain}>
        <SelectTrigger className={`w-[120px] ${large ? "h-12" : "h-10"}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHAINS.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter agent ID or search by name"
          className={`pl-9 ${large ? "h-12 text-base" : "h-10"}`}
        />
      </div>
      <Button type="submit" className={large ? "h-12 px-6" : ""}>
        Scan
      </Button>
    </form>
  );
}
