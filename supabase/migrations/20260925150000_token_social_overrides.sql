-- Corrected social links for tokens whose CoinGecko entry lists the wrong channels
-- (e.g. Jito's entry points at another project's Telegram and Discord).
-- run-token-scan applies a row here over the CoinGecko links, field by field.
-- Every row must cite the project's own page that proves the link (source_url).
CREATE TABLE IF NOT EXISTS public.token_social_overrides (
  token_address text NOT NULL,
  chain_id text NOT NULL,
  telegram text,
  discord text,
  twitter text,
  github text,
  website text,
  source_url text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (token_address, chain_id)
);

-- Same key convention as the cache tables (scanner looks up by the lowercased address).
DROP TRIGGER IF EXISTS enforce_lowercase_address ON public.token_social_overrides;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON public.token_social_overrides
  FOR EACH ROW EXECUTE FUNCTION public.normalize_token_address();

-- Service role only: no policies, so anon/authenticated clients cannot read or write.
ALTER TABLE public.token_social_overrides ENABLE ROW LEVEL SECURITY;

-- Jito (JTO): CoinGecko lists discord.gg/jtxcommunity and t.me/jtx_trade (JTX, a different project).
-- Jito's own docs link discord.gg/jito and the Telegram invite below.
INSERT INTO public.token_social_overrides (token_address, chain_id, telegram, discord, source_url, note)
VALUES (
  'jtojtomepa8bep8auqc6ext5frijwffmwqx2v2f9mcl',
  'solana',
  'https://t.me/+csIgnEQMCHhiYjVh',
  'https://discord.gg/jito',
  'https://github.com/jito-foundation/jito-omnidocs/blob/master/governance/the-jito-governance-token-jto/index.md',
  'Telegram from the JTO governance doc; Discord (Jito Developers) from bam/preconfirmations/index.md in the same repo. CoinGecko entry points at JTX channels.'
)
ON CONFLICT (token_address, chain_id) DO NOTHING;
