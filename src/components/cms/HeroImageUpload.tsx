import { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface HeroImageUploadProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HeroImageUpload({ value, onChange }: HeroImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Use an image under 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `cms/covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "-")}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="featured_image">Featured image</Label>
      <div className="flex gap-2">
        <Input id="featured_image" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." />
        <Button type="button" variant="outline" className="relative" disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </Button>
      </div>
      {value && <img src={value} alt="CMS cover preview" className="h-40 w-full rounded-md border object-cover" />}
    </div>
  );
}
