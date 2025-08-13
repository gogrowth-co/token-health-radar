-- Create copilot_events table for telemetry
CREATE TABLE copilot_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  token_address text,
  query text,
  available jsonb,
  limited boolean,
  latency_ms integer,
  created_at timestamp DEFAULT now()
);

-- Enable RLS on copilot_events
ALTER TABLE copilot_events ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own events (if we track by user later)
CREATE POLICY "Users can view copilot events" 
ON copilot_events 
FOR SELECT 
USING (true); -- For now, allow all reads for analytics

-- Create policy for system to insert events
CREATE POLICY "System can insert copilot events" 
ON copilot_events 
FOR INSERT 
WITH CHECK (true);