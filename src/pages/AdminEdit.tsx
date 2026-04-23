import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import HeroImageUpload from "@/components/cms/HeroImageUpload";
import EnglishContentSection from "@/components/cms/EnglishContentSection";
import SchemaEditor from "@/components/cms/SchemaEditor";
import { usePages } from "@/hooks/usePages";

export default function AdminEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pages, isLoading, savePage } = usePages();
  const page = pages.find((p) => p.id === id);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (page && !form) {
      setForm({ ...page, tagsText: page.tags.join(", "), metaDescription: page.meta_description, featuredImage: page.featured_image, imageAlt: page.featured_image_alt, isFeatured: page.is_featured });
    }
  }, [page, form]);

  if (isLoading || !form) return <div className="flex min-h-screen flex-col"><Navbar /><main className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main><Footer /></div>;

  const submit = async (status = form.status) => {
    await savePage.mutateAsync({ id: form.id, slug: form.slug, status, category: form.category, title: form.title, meta_description: form.metaDescription, content: form.content, featured_image: form.featuredImage, featured_image_alt: form.imageAlt, tags: form.tagsText.split(",").map((t: string) => t.trim()).filter(Boolean), read_time: form.read_time, author_name: form.author_name, is_featured: form.isFeatured, preserve_styles: form.preserve_styles, schema: form.schema });
    navigate("/admin");
  };

  return (
    <div className="flex min-h-screen flex-col"><Helmet><title>Edit CMS Page - Token Health Scan</title><meta name="robots" content="noindex, nofollow" /></Helmet><Navbar />
      <main className="container max-w-5xl flex-1 px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div><h1 className="text-3xl font-bold">Edit CMS page</h1><p className="text-muted-foreground">Current status: {form.status}</p></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div><div className="space-y-2"><Label>Category</Label><Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div className="space-y-2"><Label>Read time</Label><Input value={form.read_time || ""} onChange={(e) => setForm({ ...form, read_time: e.target.value })} /></div><div className="space-y-2"><Label>Tags</Label><Input value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} /></div></div>
          <HeroImageUpload value={form.featuredImage || ""} onChange={(featuredImage) => setForm({ ...form, featuredImage })} />
          <EnglishContentSection title={form.title} metaDescription={form.metaDescription || ""} content={form.content || ""} imageAlt={form.imageAlt || ""} onChange={(patch) => setForm({ ...form, title: patch.title ?? form.title, metaDescription: patch.metaDescription ?? form.metaDescription, content: patch.content ?? form.content, imageAlt: patch.imageAlt ?? form.imageAlt })} />
          <div className="flex items-center gap-2"><Switch checked={form.isFeatured} onCheckedChange={(isFeatured) => setForm({ ...form, isFeatured })} /><Label>Featured article</Label></div>
          <SchemaEditor value={form.schema} onChange={(schema) => setForm({ ...form, schema })} />
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={savePage.isPending}><Save className="mr-2 h-4 w-4" />Save</Button><Button type="button" variant="secondary" onClick={() => submit("published")} disabled={savePage.isPending}>Publish</Button><Button type="button" variant="outline" onClick={() => submit("draft")} disabled={savePage.isPending}>Unpublish</Button></div>
        </form>
      </main><Footer /></div>
  );
}
