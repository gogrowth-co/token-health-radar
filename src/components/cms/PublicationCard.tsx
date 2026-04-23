import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { Publication } from "@/hooks/usePublications";

export default function PublicationCard({ publication }: { publication: Publication }) {
  return (
    <article className="group overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      {publication.featured_image && (
        <Link to={`/publications/${publication.slug}`}>
          <img src={publication.featured_image} alt={publication.featured_image_alt || publication.title} className="aspect-[16/9] w-full object-cover" loading="lazy" />
        </Link>
      )}
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          {publication.category && <Badge variant="secondary">{publication.category}</Badge>}
          {publication.is_featured && <Badge>Featured</Badge>}
        </div>
        <h2 className="text-xl font-semibold leading-tight"><Link to={`/publications/${publication.slug}`} className="hover:text-primary">{publication.title}</Link></h2>
        {publication.meta_description && <p className="line-clamp-3 text-sm text-muted-foreground">{publication.meta_description}</p>}
        <div className="text-xs text-muted-foreground">{publication.author_name || "Token Health Scan"}{publication.read_time ? ` · ${publication.read_time}` : ""}</div>
      </div>
    </article>
  );
}
