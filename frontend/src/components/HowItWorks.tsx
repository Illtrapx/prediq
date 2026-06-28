// Homepage-only "How it works" — three steps that come alive on hover:
// the card lifts, its icon + number warm to sunset-orange, a real technical
// detail slides in, and a sunset accent rail sweeps across the bottom.

type IconKind = 'lock' | 'pools' | 'reveal'

const STEPS: { n: string; t: string; d: string; detail: string; icon: IconKind }[] = [
  {
    n: '01',
    t: 'Bet privately',
    d: 'Amount and side are encrypted client-side with FHE before they ever touch the chain.',
    detail: 'euint64 amount · ebool side',
    icon: 'lock',
  },
  {
    n: '02',
    t: 'Pools stay sealed',
    d: 'YES / NO totals accumulate as ciphertext. Both update every bet, hiding your choice.',
    detail: 'FHE.select on every bet',
    icon: 'pools',
  },
  {
    n: '03',
    t: 'Reveal at resolution',
    d: 'Only aggregate pools decrypt via the KMS. Winners claim a private payout.',
    detail: 'publicDecrypt → checkSignatures',
    icon: 'reveal',
  },
]

function StepIcon({ icon }: { icon: IconKind }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (icon === 'lock') {
    return (
      <svg {...common}>
        <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
        {/* shackle — springs closed on hover */}
        <path className="lock-shackle" d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </svg>
    )
  }
  if (icon === 'pools') {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="5" rx="1.5" />
        <rect x="4" y="13" width="16" height="5" rx="1.5" />
        <path d="M8 8.5h3M8 15.5h5" strokeOpacity="0.45" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  )
}

export function HowItWorks() {
  return (
    <section className="py-14">
      <div className="eyebrow mb-8">How it works</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map(s => (
          <div key={s.n} className="how-card card">
            <div className="flex items-center justify-between">
              <span className="how-icon">
                <StepIcon icon={s.icon} />
              </span>
              <span className="eyebrow how-num">{s.n}</span>
            </div>
            <div className="text-ink text-base mt-4">{s.t}</div>
            <div className="text-mute text-sm mt-2 leading-relaxed">{s.d}</div>
            <div className="how-detail eyebrow text-sunset/80 text-[10px]">{s.detail}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
