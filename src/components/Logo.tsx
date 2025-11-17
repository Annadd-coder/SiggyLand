'use client'
export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden style={{ display:'block' }}>
      <defs>
        <radialGradient id="g1" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#dfe7ff" />
          <stop offset="100%" stopColor="#a8c5ff" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#g1)" opacity="0.95" />
      <circle cx="20" cy="20" r="18" fill="#7aa2ff" opacity="0.15" />
      <g fill="#0b1222" opacity="0.85" transform="translate(20 20)">
        <path d="M0-9 2.2-3.4 8.2-3.2 3.6 0.7 5 6.6 0 3.4 -5 6.6 -3.6 0.7 -8.2-3.2 -2.2-3.4Z" />
      </g>
    </svg>
  )
}