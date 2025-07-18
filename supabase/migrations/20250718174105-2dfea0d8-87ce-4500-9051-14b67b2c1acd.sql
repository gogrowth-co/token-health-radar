-- Create table for storing AI-generated token reports
CREATE TABLE public.token_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address text NOT NULL,
  chain_id text NOT NULL DEFAULT '0x1',
  token_symbol text NOT NULL,
  token_name text NOT NULL,
  report_content jsonb NOT NULL,
  generated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(token_address, chain_id)
);

-- Enable RLS
ALTER TABLE public.token_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access for reports (they should be publicly accessible)
CREATE POLICY "Public read access to token reports"
ON public.token_reports
FOR SELECT
USING (true);

-- Only admins can create/update reports
CREATE POLICY "Admins can manage token reports"
ON public.token_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Service role full access
CREATE POLICY "Service role full access to token reports"
ON public.token_reports
FOR ALL
USING (auth.role() = 'service_role');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_token_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_token_reports_updated_at
BEFORE UPDATE ON public.token_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_token_reports_updated_at();