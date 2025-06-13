
-- Allow nullable user_id in token_scans table for anonymous scans
ALTER TABLE token_scans ALTER COLUMN user_id DROP NOT NULL;

-- Add column to track anonymous scans
ALTER TABLE token_scans ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;

-- Add index for better performance on anonymous scans
CREATE INDEX idx_token_scans_anonymous ON token_scans(is_anonymous, scanned_at);

-- Update RLS policies to allow anonymous read access to basic scan data
CREATE POLICY "Anonymous users can view basic scan data" 
  ON token_scans 
  FOR SELECT 
  USING (true);

-- Create a table to track anonymous scan attempts for rate limiting
CREATE TABLE anonymous_scan_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET,
  token_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN DEFAULT FALSE
);

-- Add RLS to anonymous_scan_attempts
ALTER TABLE anonymous_scan_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write to track attempts
CREATE POLICY "Allow anonymous scan tracking" 
  ON anonymous_scan_attempts 
  FOR ALL 
  USING (true);
