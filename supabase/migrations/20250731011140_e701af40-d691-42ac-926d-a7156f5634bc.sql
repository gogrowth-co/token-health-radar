-- Update RNDR token data with correct social media handles and GitHub repository
UPDATE token_data_cache 
SET 
  twitter_handle = 'RenderToken',
  github_url = 'https://github.com/rndr-network',
  website_url = 'https://rendernetwork.com'
WHERE token_address = '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24';

-- Clear cached community data to force refresh with correct Twitter handle
DELETE FROM token_community_cache WHERE token_address = '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24';

-- Clear cached development data to force refresh with correct GitHub URL
DELETE FROM token_development_cache WHERE token_address = '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24';