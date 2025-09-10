-- Delete the Unknown Token report
DELETE FROM token_reports 
WHERE token_symbol = 'UNKNOWN' 
AND token_name = 'Unknown Token' 
AND token_address = '0xda5e1988097297dcdc1f90d4dfe7909e847cbef6';