-- Create trigger to update sitemap when token reports are updated
CREATE TRIGGER token_reports_sitemap_update_on_update
  AFTER UPDATE ON public.token_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sitemap_update();