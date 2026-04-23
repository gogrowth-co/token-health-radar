DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
DROP POLICY IF EXISTS "Admins can delete non-system pages" ON public.pages;

CREATE POLICY "Admins can create pages"
ON public.pages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pages"
ON public.pages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete non-system pages"
ON public.pages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND NOT is_system_page);

DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;
CREATE POLICY "Public can view CMS public files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'blog-images'
  AND (
    name LIKE 'cms/covers/%'
    OR name = 'rss.xml'
    OR name = 'rss-en.xml'
    OR name = 'rss/en.xml'
    OR name = 'llms.txt'
    OR name = 'llms-full.txt'
  )
);