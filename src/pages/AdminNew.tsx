import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
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
import { slugFromTitle } from "@/lib/slugFormatter";

export default function AdminNew() {
  const navigate = useNavigate();
  const { savePage } = usePages();
  const [form, setForm] = useState({ title: "", slug: "", status: "draft" as "draft" | "published", category: "guide", metaDescription: "", content: "", featuredImage: "", imageAlt: "", tags: "", readTime: "", isFeatured: false, schema: null as unknown });
  const submit = async (status = form.status) => {
    const slug = form.slug || slugFromTitle(form.title);
    await savePage.mutateAsync({ slug, status, category: form.category, title: form.title, meta_description: form.metaDescription, content: form.content, featured_image: form.featuredImage, featured_image_alt: form.imageAlt, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean), read_time: form.readTime, is_featured: form.isFeatured, schema: form.schema });
    navigate("/admin");
  };
  return (
    <div className="flex min-h-screen flex-col"><Helmet><title>New CMS Page - Token Health Scan</title><meta name="robots" content="noindex, nofollow" /></Helmet><Navbar />
      <main className="container max-w-5xl flex-1 px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div><h1 className="text-3xl font-bold">New CMS page</h1><p className="text-muted-foreground">Create an English article for /publications.</p></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-from-title" /></div><div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div className="space-y-2"><Label>Read time</Label><Input value={form.readTime} onChange={(e) => setForm({ ...form, readTime: e.target.value })} placeholder="7 min read" /></div><div className="space-y-2"><Label>Tags</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="token research, risk" /></div></div>
          <HeroImageUpload value={form.featuredImage} onChange={(featuredImage) => setForm({ ...form, featuredImage })} />
          <EnglishContentSection title={form.title} metaDescription={form.metaDescription} content={form.content} imageAlt={form.imageAlt} onChange={(patch) => setForm({ ...form, title: patch.title ?? form.title, metaDescription: patch.metaDescription ?? form.metaDescription, content: patch.content ?? form.content, imageAlt: patch.imageAlt ?? form.imageAlt })} />
          <div className="flex items-center gap-2"><Switch checked={form.isFeatured} onCheckedChange={(isFeatured) => setForm({ ...form, isFeatured })} /><Label>Featured article</Label></div>
          <SchemaEditor value={form.schema} onChange={(schema) => setForm({ ...form, schema })} />
          <div className="flex gap-2"><Button type="submit" disabled={savePage.isPending}><Save className="mr-2 h-4 w-4" />Save draft</Button><Button type="button" variant="secondary" disabled={savePage.isPending} onClick={() => submit("published")}>Publish</Button></div>
        </form>
      </main><Footer /></div>
  );
}
