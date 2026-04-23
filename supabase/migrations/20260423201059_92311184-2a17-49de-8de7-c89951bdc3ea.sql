CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured_image text,
  author_name text DEFAULT 'Token Health Scan',
  read_time text,
  reading_time integer,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  view_count integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_system_page boolean NOT NULL DEFAULT false,
  preserve_styles boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  title text NOT NULL,
  meta_description text,
  content text,
  featured_image_alt text,
  slug text,
  schema jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, language)
);

CREATE INDEX IF NOT EXISTS pages_status_idx ON public.pages(status);
CREATE INDEX IF NOT EXISTS pages_slug_idx ON public.pages(slug);
CREATE INDEX IF NOT EXISTS pages_featured_idx ON public.pages(is_featured);
CREATE INDEX IF NOT EXISTS pages_updated_at_idx ON public.pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS page_translations_page_id_idx ON public.page_translations(page_id);
CREATE INDEX IF NOT EXISTS page_translations_language_idx ON public.page_translations(language);
CREATE INDEX IF NOT EXISTS page_translations_slug_idx ON public.page_translations(slug);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published pages" ON public.pages;
CREATE POLICY "Public can view published pages"
ON public.pages
FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages"
ON public.pages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete non-system pages" ON public.pages;
CREATE POLICY "Admins can delete non-system pages"
ON public.pages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND NOT is_system_page);

DROP POLICY IF EXISTS "Public can view published translations" ON public.page_translations;
CREATE POLICY "Public can view published translations"
ON public.page_translations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.pages
    WHERE pages.id = page_translations.page_id
      AND pages.status = 'published'
  )
);

DROP POLICY IF EXISTS "Admins can manage translations" ON public.page_translations;
CREATE POLICY "Admins can manage translations"
ON public.page_translations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_pages_updated_at ON public.pages;
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_page_translations_updated_at ON public.page_translations;
CREATE TRIGGER update_page_translations_updated_at
BEFORE UPDATE ON public.page_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;
CREATE POLICY "Public can view blog images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Admins can update blog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Admins can delete blog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can manage blog images" ON storage.objects;
CREATE POLICY "Service role can manage blog images"
ON storage.objects
FOR ALL
USING (bucket_id = 'blog-images' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'service_role');