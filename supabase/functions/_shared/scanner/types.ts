// Shared types for the scanner reliability layer.
import type { Field } from './field.ts';
import type { ScanContext } from './http.ts';
import type { ConcentrationFields } from './holders.ts';
import type { MarketData, UnlockData } from './market.ts';

/** Everything a chain adapter measures on-chain (or via chain-specific providers). */
export interface ChainFacts extends ConcentrationFields {
  decimals: Field<number>;
  total_supply_onchain: Field<number>;
  token_standard: Field<string>;
  mint_authority_active: Field<boolean>; // Solana mint authority / EVM mintable
  freeze_authority_active: Field<boolean>; // Solana freeze authority (EVM: n/a, see blacklist)
  permanent_delegate: Field<boolean>;
  transfer_hook: Field<boolean>;
  transfer_tax_pct: Field<number>;
  buy_tax_pct: Field<number>;
  sell_tax_pct: Field<number>;
  honeypot: Field<boolean>;
  upgradeable_proxy: Field<boolean>;
  owner_address: Field<string>;
  pausable: Field<boolean>;
  blacklist: Field<boolean>;
  liquidity_locked_pct: Field<number>;
  creator_holding_pct: Field<number>;
}

export interface LiquidityFacts {
  dex_liquidity_usd: Field<number>;
  pool_count: Field<number>;
  top_pools: Field<Array<{ dex: string; name: string; address: string; liquidity_usd: number; volume_24h_usd: number }>>;
  dex_volume_24h_usd: Field<number>;
  slippage_10k_pct: Field<number>;
  slippage_100k_pct: Field<number>;
}

export interface ChainAdapter {
  family: 'solana' | 'evm';
  cgPlatform(chainId: string): string | null;
  nansenChain(chainId: string): string | null;
  collect(ctx: ScanContext, address: string, market: MarketData, chainId: string): Promise<ChainFacts>;
  sellQuotes(ctx: ScanContext, address: string, decimals: number, priceUsd: number, chainId: string): Promise<{ slippage_10k_pct: Field<number>; slippage_100k_pct: Field<number> }>;
}

export interface Flag {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  field?: string;
  detail: string;
}

export interface DataQuality {
  fields_total: number;
  fields_ok: number;
  fields_disputed: number;
  fields_unknown: number;
  fields_not_applicable: number;
  completeness_pct: number; // ok / (total - not_applicable)
  required_missing: string[]; // required fields that are not usable
  provider_failures: Record<string, string>;
  provider_calls: Record<string, { calls: number; failures: number; credits: number; ms: number }>;
  paid_credits: number;
  flags: Flag[];
}

export interface ScanRecord {
  schema_version: 1;
  scanned_at: string;
  chain_id: string; // 'solana' | '0x1' | ...
  address_input: string;
  address_canonical: Field<string>; // exact-case address used for every provider call
  address_key: string; // lowercased DB lookup key only
  market: MarketData;
  chain: ChainFacts;
  liquidity: LiquidityFacts;
  unlocks: UnlockData;
  derived: {
    circulating_ratio: Field<number>; // circulating / total (market, same-definition pair)
    noncirculating_supply: Field<number>;
    burned_since_max: Field<number>;
    fdv_to_mcap: Field<number>;
    unlock_30d_pct_of_circ: Field<number>;
    unlock_90d_pct_of_circ: Field<number>;
  };
  quality: DataQuality;
}

export type { ConcentrationFields, MarketData, UnlockData };
