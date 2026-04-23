import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SchemaEditorProps {
  value: unknown;
  onChange: (value: unknown) => void;
}

export default function SchemaEditor({ value, onChange }: SchemaEditorProps) {
  const text = value ? JSON.stringify(value, null, 2) : "";
  return (
    <div className="space-y-2">
      <Label htmlFor="schema">JSON-LD schema</Label>
      <Textarea
        id="schema"
        value={text}
        rows={8}
        placeholder='{"@type":"Article"}'
        onChange={(event) => {
          const next = event.target.value;
          if (!next.trim()) return onChange(null);
          try { onChange(JSON.parse(next)); } catch { onChange(next); }
        }}
      />
    </div>
  );
}
