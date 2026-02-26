-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create token_description_overrides table
CREATE TABLE public.token_description_overrides (
  token_address TEXT NOT NULL PRIMARY KEY,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_description_overrides ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to token_description_overrides"
  ON public.token_description_overrides
  FOR SELECT
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access to token_description_overrides"
  ON public.token_description_overrides
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Auto-update updated_at trigger
CREATE TRIGGER update_token_description_overrides_updated_at
  BEFORE UPDATE ON public.token_description_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data (idempotent)
INSERT INTO public.token_description_overrides (token_address, description) VALUES
  ('0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', 'Aave is a decentralized lending protocol where users can lend and borrow cryptocurrencies. AAVE token holders can stake their tokens for protocol security and governance.'),
  ('0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'Uniswap is a decentralized exchange protocol that uses automated market makers (AMMs) instead of traditional order books. UNI is its governance token.'),
  ('0x6b175474e89094c44da98b954eedeac495271d0f', 'Dai is a decentralized stablecoin pegged to the US dollar, maintained by the MakerDAO protocol through collateralized debt positions.'),
  ('0x514910771af9ca656af840dff83e8264ecf986ca', 'Chainlink provides decentralized oracle networks that connect smart contracts to real-world data, enabling secure and reliable off-chain data access.'),
  ('0x0d8775f648430679a709e98d2b0cb6250d2887ef', 'Basic Attention Token powers the Brave browser ecosystem, rewarding users for viewing privacy-respecting ads and enabling content creator monetization.'),
  ('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'USD Coin (USDC) is a fully-backed stablecoin pegged 1:1 to the US dollar, issued by Circle and regulated under US money transmission laws.'),
  ('0xdac17f958d2ee523a2206206994597c13d831ec7', 'Tether (USDT) is the largest stablecoin by market cap, pegged to the US dollar and widely used for trading and cross-border transactions.'),
  ('0x4200000000000000000000000000000000000006', 'Wrapped Ether (WETH) on Base is an ERC-20 compatible version of ETH, enabling it to be used in DeFi protocols and smart contracts.'),
  ('0x912ce59144191c1204e64559fe8253a0e49e6548', 'Arbitrum (ARB) is the governance token for Arbitrum One, a leading Ethereum Layer 2 scaling solution using optimistic rollups.'),
  ('0x0b2c639c533813f4aa9d7837caf62653d097ff85', 'USD Coin on Optimism - bridged version of USDC on the Optimism Layer 2 network for faster and cheaper transactions.'),
  ('0x6bef15d938d4e72056ac92ea4bdd0d76b1c4ad29', 'Succinct (PROVE) is an ERC-20 on Ethereum powering SP1 decentralized prover network for fast zero-knowledge proofs.'),
  ('0x808507121b80c02388fad14726482e061b8da827', 'Pendle enables users to tokenize and trade future yield, separating ownership of the principal and yield components of yield-bearing tokens.'),
  ('0x9d65ff81a3c488d585bbfb0bfe3c7707c7917f54', 'SSV Network provides distributed validator technology for Ethereum staking, enabling resilient and secure validator operations.'),
  ('0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', 'Shiba Inu (SHIB) is an Ethereum-based meme token with a large community and expanding DeFi ecosystem including ShibaSwap DEX.')
ON CONFLICT (token_address) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();