import type { Publication } from "@/hooks/usePublications";
import { sanitizeHtml } from "@/lib/contentCleaner";
import { Badge } from "@/components/ui/badge";

export default function BlogTemplate({ page }: { page: Publication }) {
  return (
    <article className="container max-w-4xl px-4 py-10 md:py-14">
      <header className="mb-8 space-y-5">
        <div className="flex flex-wrap gap-2">
          {page.category && <Badge variant="secondary">{page.category}</Badge>}
          {page.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
        </div>
        <h1 className="text-4xl font-bold tracking-normal md:text-5xl">{page.title}</h1>
        {page.meta_description && <p className="text-lg text-muted-foreground md:text-xl">{page.meta_description}</p>}
        <div className="text-sm text-muted-foreground">{page.author_name || "Token Health Scan"} · {new Date(page.updated_at || page.created_at).toLocaleDateString()}{page.read_time ? ` · ${page.read_time}` : ""}</div>
      </header>
      {page.featured_image && <img src={page.featured_image} alt={page.featured_image_alt || page.title} className="mb-8 aspect-[16/9] w-full rounded-lg border object-cover" />}
      <div className="prose prose-slate max-w-none dark:prose-invert prose-a:text-primary" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }} />
    </article>
  );
}
