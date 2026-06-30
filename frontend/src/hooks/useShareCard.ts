/**
 * useShareCard — captures a ShareCard ref via html2canvas and exposes
 * downloadCard() + shareToX() helpers.
 *
 * Usage:
 *   const cardRef = useRef<HTMLDivElement>(null)
 *   const { downloadCard, shareToX, capturing } = useShareCard(cardRef, { question, side, txHash })
 */

import { useRef, useState, useCallback } from 'react'
import type { RefObject } from 'react'
import { VERCEL_URL } from '../lib/constants'

type Options = {
  marketQuestion: string
  side: boolean
  txHash?: string | null
  marketId?: number
}

type UseShareCardReturn = {
  capturing: boolean
  downloadCard: () => Promise<void>
  shareToX: () => Promise<void>
}

async function captureCard(ref: RefObject<HTMLDivElement | null>): Promise<Blob> {
  if (!ref.current) throw new Error('Card ref not mounted')

  // Lazy-load html2canvas so the main bundle is not burdened on every page.
  const { default: html2canvas } = await import('html2canvas')

  const canvas = await html2canvas(ref.current, {
    // Match the card's explicit dimensions exactly.
    width: 400,
    height: 500,
    scale: 2, // 2× = 800×1000px — crisp on retina
    useCORS: true,
    backgroundColor: '#0a0a0a',
    // Logging off — html2canvas logs can be noisy.
    logging: false,
  })

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      'image/png',
    )
  })
}

export function useShareCard(
  ref: RefObject<HTMLDivElement | null>,
  opts: Options,
): UseShareCardReturn {
  const [capturing, setCapturing] = useState(false)
  // Cache the last generated blob so download + share don't re-render twice.
  const cached = useRef<Blob | null>(null)

  const getBlob = useCallback(async (): Promise<Blob> => {
    if (cached.current) return cached.current
    setCapturing(true)
    try {
      const blob = await captureCard(ref)
      cached.current = blob
      return blob
    } finally {
      setCapturing(false)
    }
  }, [ref])

  const downloadCard = useCallback(async () => {
    const blob = await getBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prediq-prediction.png'
    a.click()
    // Clean up the object URL after a short delay so the click fires.
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }, [getBlob])

  const shareToX = useCallback(async () => {
    // Generate (and cache) the image, but we can't attach binary files to a
    // Twitter intent URL — Twitter web intent only accepts text. The canonical
    // pattern is: offer download first, then open the tweet dialog with
    // pre-filled text so the user can attach the downloaded image manually.
    // Many "Share on X" implementations (including Polymarket) do exactly this.
    await downloadCard()

    const side = opts.side ? 'YES' : 'NO'
    const txPart = opts.txHash
      ? `\nVerify on-chain: https://sepolia.etherscan.io/tx/${opts.txHash}`
      : ''

    // Per-market share link unfurls a dynamic OG card (api/m/:id → api/og).
    const link = opts.marketId != null ? `${VERCEL_URL}/m/${opts.marketId}` : VERCEL_URL

    const text =
      `I just predicted ${side} on "${opts.marketQuestion}" 🔐\n` +
      `My bet amount is encrypted using Zama FHE — nobody can see my position size.` +
      txPart +
      `\nTrade on PredIQ: ${link}` +
      `\n#ZamaFHE #PredIQ #OnChainPredictions`

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(intentUrl, '_blank', 'noopener,noreferrer')
  }, [downloadCard, opts.side, opts.marketQuestion, opts.txHash, opts.marketId])

  return { capturing, downloadCard, shareToX }
}
