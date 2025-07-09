-- Add circulating_supply field to token_data_cache table
ALTER TABLE public.token_data_cache 
ADD COLUMN circulating_supply numeric;