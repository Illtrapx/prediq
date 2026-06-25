type Props = { status: 'idle' | 'pending' | 'success' | 'error'; message?: string }

export function TxStatus({ status, message }: Props) {
  if (status === 'idle') return null

  // Monochrome-leaning; only error surfaces a warm accent.
  const styles: Record<string, string> = {
    pending: 'border-hairline bg-canvas-soft text-body',
    success: 'border-white/25 bg-white/[0.04] text-ink',
    error: 'border-[#ff7a17]/40 bg-[#ff7a17]/[0.08] text-[#ffc285]',
  }
  const prefix: Record<string, string> = {
    pending: '· ',
    success: '✓ ',
    error: '✗ ',
  }
  const fallback: Record<string, string> = {
    pending: 'Waiting for transaction…',
    success: 'Transaction confirmed',
    error: 'Transaction failed',
  }
  return (
    <div className={`mt-3 text-sm px-3 py-2 border rounded-lg break-words ${styles[status]}`}>
      {prefix[status]}{message ?? fallback[status]}
    </div>
  )
}
