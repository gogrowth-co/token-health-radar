import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { slugFromTitle } from "@/lib/slugFormatter";

export interface CmsPageInput {
  id?: string;
  slug: string;
  status: "draft" | "published";
  category?: string | null;
  title: string;
  meta_description?: string | null;
  content?: string | null;
  featured_image?: string | null;
  featured_image_alt?: string | null;
  author_name?: string | null;
  read_time?: string | null;
  reading_time?: number | null;
  tags?: string[];
  is_featured?: boolean;
  preserve_styles?: boolean;
  schema?: unknown;
}

const db = supabase as any;

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  return [];
}

function mapAdminPage(row: any) {
  const t = Array.isArray(row.page_translations) ? row.page_translations[0] : row.page_translations;
  return {
    id: row.id,
    slug: row.slug,
    localized_slug: t?.slug || row.slug,
    status: row.status as "draft" | "published",
    category: row.category || "",
    featured_image: row.featured_image || "",
    author_name: row.author_name || "Token Health Scan",
    read_time: row.read_time || "",
    reading_time: row.reading_time || undefined,
    tags: normalizeTags(row.tags),
    is_featured: Boolean(row.is_featured),
    is_system_page: Boolean(row.is_system_page),
    preserve_styles: Boolean(row.preserve_styles),
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: t?.title || "",
    meta_description: t?.meta_description || "",
    content: t?.content || "",
    featured_image_alt: t?.featured_image_alt || "",
    schema: t?.schema || null,
  };
}

async function triggerOutputs(slug?: string) {
  await Promise.allSettled([
    supabase.functions.invoke("generate-cms-rss"),
    supabase.functions.invoke("generate-cms-llms-txt"),
    supabase.functions.invoke("regenerate-cms-snapshot", { body: slug ? { slug } : { all: true } }),
    slug ? supabase.functions.invoke("submit-indexnow", { body: { url: `https://tokenhealthscan.com/publications/${slug}` } }) : Promise.resolve(),
  ]);
}

export function usePages() {
  const queryClient = useQueryClient();
  const pagesQuery = useQuery({
    queryKey: ["cms-pages-admin"],
    queryFn: async () => {
      const { data, error } = await db
        .from("pages")
        .select("*, page_translations(*)")
        .eq("page_translations.language", "en")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapAdminPage);
    },
  });

  const savePage = useMutation({
    mutationFn: async (input: CmsPageInput) => {
      const slug = input.slug || slugFromTitle(input.title);
      const pagePayload = {
        slug,
        status: input.status,
        category: input.category || null,
        featured_image: input.featured_image || null,
        author_name: input.author_name || "Token Health Scan",
        read_time: input.read_time || null,
        reading_time: input.reading_time || null,
        tags: input.tags || [],
        is_featured: Boolean(input.is_featured),
        preserve_styles: Boolean(input.preserve_styles),
      };
      const { data: page, error: pageError } = input.id
        ? await db.from("pages").update(pagePayload).eq("id", input.id).select("*").single()
        : await db.from("pages").insert(pagePayload).select("*").single();
      if (pageError) throw pageError;

      const translationPayload = {
        page_id: page.id,
        language: "en",
        title: input.title,
        meta_description: input.meta_description || null,
        content: input.content || null,
        featured_image_alt: input.featured_image_alt || null,
        slug,
        schema: input.schema || null,
      };
      const { error: translationError } = await db
        .from("page_translations")
        .upsert(translationPayload, { onConflict: "page_id,language" });
      if (translationError) throw translationError;
      if (input.status === "published") await triggerOutputs(slug);
      return page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages-admin"] });
      toast({ title: "Page saved", description: "CMS content has been updated." });
    },
    onError: (error: any) => toast({ title: "Save failed", description: error.message, variant: "destructive" }),
  });

  const deletePage = useMutation({
    mutationFn: async (page: { id: string; slug: string; is_system_page?: boolean }) => {
      if (page.is_system_page) throw new Error("System pages cannot be deleted.");
      const { error } = await db.from("pages").delete().eq("id", page.id);
      if (error) throw error;
      await supabase.functions.invoke("regenerate-cms-snapshot", { body: { slug: page.slug, remove: true } });
      await triggerOutputs();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-pages-admin"] });
      toast({ title: "Page deleted", description: "CMS outputs were refreshed." });
    },
    onError: (error: any) => toast({ title: "Delete failed", description: error.message, variant: "destructive" }),
  });

  const refreshOutputs = useMutation({
    mutationFn: async () => triggerOutputs(),
    onSuccess: () => toast({ title: "Outputs refreshed", description: "RSS, llms.txt, and snapshots are regenerating." }),
  });

  return { ...pagesQuery, pages: pagesQuery.data || [], savePage, deletePage, refreshOutputs };
}
