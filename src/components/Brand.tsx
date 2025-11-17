'use client'
type Props = { text?: string; className?: string }

const PASTELS = [
  '#a8c5ff', '#c9e6ff', '#c8f1e8', '#f9e0c6', '#f5e7a8',
  '#d6ccff', '#bfe5d6', '#ffcfe0', '#c7d6ff',
]

export default function Brand({ text = 'SiggyLand', className }: Props) {
  return (
    <span className={['brandText', className].filter(Boolean).join(' ')}>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="brand-letter" style={{ color: PASTELS[i % PASTELS.length] }}>
          {ch}
        </span>
      ))}
    </span>
  )
}