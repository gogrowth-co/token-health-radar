-- Create trigger to automatically update sitemap when new token reports are created
CREATE OR REPLACE TRIGGER trigger_sitemap_update_on_new_report
  AFTER INSERT ON token_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sitemap_update();