
-- Create table to store generated token reports
CREATE TABLE public.token_risk_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain_id TEXT NOT NULL DEFAULT '0x1',
  report_content JSONB NOT NULL,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token_address, chain_id)
);

-- Add Row Level Security
ALTER TABLE public.token_risk_reports ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all reports
CREATE POLICY "Admins can view all reports" 
  ON public.token_risk_reports 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to create reports
CREATE POLICY "Admins can create reports" 
  ON public.token_risk_reports 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update reports
CREATE POLICY "Admins can update reports" 
  ON public.token_risk_reports 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow service role full access
CREATE POLICY "Service role full access to reports" 
  ON public.token_risk_reports 
  FOR ALL 
  USING (auth.role() = 'service_role');
