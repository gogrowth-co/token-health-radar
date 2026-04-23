import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "./RichTextEditor";

interface EnglishContentSectionProps {
  title: string;
  metaDescription: string;
  content: string;
  imageAlt: string;
  onChange: (patch: Partial<{ title: string; metaDescription: string; content: string; imageAlt: string }>) => void;
}

export default function EnglishContentSection({ title, metaDescription, content, imageAlt, onChange }: EnglishContentSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => onChange({ title: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meta">Meta description</Label>
        <Textarea id="meta" value={metaDescription} maxLength={160} onChange={(e) => onChange({ metaDescription: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="image-alt">Featured image alt text</Label>
        <Input id="image-alt" value={imageAlt} onChange={(e) => onChange({ imageAlt: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <RichTextEditor value={content} onChange={(value) => onChange({ content: value })} />
      </div>
    </div>
  );
}
