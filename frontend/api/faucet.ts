import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ethers } from 'ethers'
import { createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/node'
import { CST_ADDRESS, RPC_URL, supabase, userFacingError } from './_lib/config'

const ABI = [
  'function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32)',
]

// Rate-limited by wallet address AND originating IP (each capped to 1 claim per 24 h).
// Claims are recorded in Supabase `faucet_claims` (columns: address, ip, claimed_at)
// after a successful transfer. The insert is non-fatal if it fails.
const COOLDOWN_MS = 24 * 60 * 60 * 1000

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  const { address } = (req.body ?? {}) as { address?: string }

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid or missing "address".' })
  }

  try {
    const addr = address.toLowerCase()
    const ip = (req.headers['x-forwarded-for']?.toString() ?? '').split(',')[0].trim() || 'unknown'
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString()

    const [{ data: addrRow }, { data: ipRow }] = await Promise.all([
      supabase
        .from('faucet_claims')
        .select('id')
        .eq('address', addr)
        .gte('claimed_at', cutoff)
        .maybeSingle(),
      supabase
        .from('faucet_claims')
        .select('id')
        .eq('ip', ip)
        .gte('claimed_at', cutoff)
        .maybeSingle(),
    ])

    if (addrRow)
      return res
        .status(429)
        .json({ error: 'Already claimed in the last 24 h. Come back tomorrow.' })
    if (ipRow) return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' })

    const PK = process.env.FAUCET_PRIVATE_KEY
    if (!PK) return res.status(500).json({ error: 'Server misconfigured.' })

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PK, provider)

    const instance = await createInstance({ ...SepoliaConfig, network: RPC_URL })

    const enc = await instance
      .createEncryptedInput(CST_ADDRESS, wallet.address)
      .add64(1000n)
      .encrypt()

    const cst = new ethers.Contract(CST_ADDRESS, ABI, wallet)
    const tx = await cst.confidentialTransfer(address, enc.handles[0], enc.inputProof)
    await tx.wait()

    // Record after successful transfer — non-fatal if this fails.
    await supabase.from('faucet_claims').insert({ address: addr, ip })

    return res.status(200).json({ ok: true, txHash: tx.hash })
  } catch (err) {
    console.error('faucet error:', err)
    return res.status(500).json({ error: userFacingError(err) })
  }
}
