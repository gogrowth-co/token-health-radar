-- Create trigger to automatically update sitemap when new token reports are added
CREATE TRIGGER token_reports_sitemap_update
  AFTER INSERT ON public.token_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sitemap_update();