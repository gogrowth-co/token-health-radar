import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Publication {
  id: string;
  slug: string;
  category: string | null;
  status: "draft" | "published";
  featured_image: string | null;
  author_name: string | null;
  read_time: string | null;
  reading_time: number | null;
  tags: string[];
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  meta_description: string | null;
  content: string | null;
  featured_image_alt: string | null;
  schema: unknown;
}

function mapPage(row: any): Publication {
  const translation = Array.isArray(row.page_translations) ? row.page_translations[0] : row.page_translations;
  return {
    id: row.id,
    slug: translation?.slug || row.slug,
    category: row.category,
    status: row.status,
    featured_image: row.featured_image,
    author_name: row.author_name,
    read_time: row.read_time,
    reading_time: row.reading_time,
    tags: Array.isArray(row.tags) ? row.tags : [],
    is_featured: Boolean(row.is_featured),
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: translation?.title || row.slug,
    meta_description: translation?.meta_description || null,
    content: translation?.content || null,
    featured_image_alt: translation?.featured_image_alt || null,
    schema: translation?.schema || null,
  };
}

export function usePublications() {
  return useQuery({
    queryKey: ["publications"],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("pages")
        .select("*, page_translations(*)")
        .eq("status", "published")
        .eq("page_translations.language", "en")
        .order("is_featured", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPage) as Publication[];
    },
  });
}

export function usePublicPage(slug: string | undefined) {
  return useQuery({
    queryKey: ["publication", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db
        .from("pages")
        .select("*, page_translations(*)")
        .eq("status", "published")
        .or(`slug.eq.${slug},page_translations.slug.eq.${slug}`)
        .eq("page_translations.language", "en")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapPage(data) : null;
    },
  });
}
