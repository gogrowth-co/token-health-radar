-- Create trigger to update sitemap when token reports are inserted or updated
CREATE TRIGGER token_reports_sitemap_update
  AFTER INSERT OR UPDATE ON public.token_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sitemap_update();