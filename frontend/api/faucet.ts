import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/node';

// CST (Confidential Stake Token, ERC7984) on Sepolia.
const CST_ADDRESS = '0xF9B73bF34D8EAb58D3d3498714BF22C2a927463B';

// Minimal, self-contained ABI: the external (with-proof) confidentialTransfer overload.
const ABI = [
  'function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32)',
];

// Publishable Supabase key — not a secret; designed for client-side/server-side anon use.
// RLS on faucet_claims allows INSERT/SELECT for anon; no UPDATE or DELETE.
const SUPABASE_URL = 'https://qwimhbsdfcjoikrhtyxc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UuqUSTGGW0pR9U__BZc5gA_Of7jTUl6';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { address } = (req.body ?? {}) as { address?: string };

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid or missing "address".' });
    }

    // Rate limiting: 24 h cooldown per address and per originating IP.
    const ip =
      (req.headers['x-forwarded-for']?.toString() ?? '').split(',')[0].trim() || 'unknown';
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();

    const [{ data: addrRow }, { data: ipRow }] = await Promise.all([
      sb
        .from('faucet_claims')
        .select('id')
        .eq('address', address.toLowerCase())
        .gte('claimed_at', cutoff)
        .maybeSingle(),
      sb
        .from('faucet_claims')
        .select('id')
        .eq('ip', ip)
        .gte('claimed_at', cutoff)
        .maybeSingle(),
    ]);

    if (addrRow)
      return res.status(429).json({ error: 'Already claimed in the last 24 h. Come back tomorrow.' });
    if (ipRow)
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });

    const PK = process.env.FAUCET_PRIVATE_KEY;
    if (!PK) {
      return res
        .status(500)
        .json({ error: 'Server misconfigured: FAUCET_PRIVATE_KEY env var is not set.' });
    }

    const RPC_URL =
      process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PK, provider);

    // Build a Sepolia relayer instance. The node SDK loads its WASM/TFHE
    // bindings natively at import — no initSDK() step (that's web-only).
    const instance = await createInstance({ ...SepoliaConfig, network: RPC_URL });

    // Encrypt the amount bound to (CST_ADDRESS, deployerAddress) since the
    // deployer is msg.sender for the transfer.
    const enc = await instance
      .createEncryptedInput(CST_ADDRESS, wallet.address)
      .add64(1000n)
      .encrypt();

    const cst = new ethers.Contract(CST_ADDRESS, ABI, wallet);

    const tx = await cst.confidentialTransfer(address, enc.handles[0], enc.inputProof);
    await tx.wait();

    // Record the claim; ignore insert errors (non-fatal — transfer already succeeded).
    await sb.from('faucet_claims').insert({ address: address.toLowerCase(), ip });

    return res.status(200).json({ ok: true, txHash: tx.hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('faucet error:', err);
    return res.status(500).json({ error: message });
  }
}
