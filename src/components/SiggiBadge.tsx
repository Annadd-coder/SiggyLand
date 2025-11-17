'use client'

type Props = {
  height?: number
  mode?: 'single' | 'stack'
  label1?: string
  label2?: string
}

export default function SiggiBadge({
  height = 72,
  mode = 'single',
  label1 = 'Siggy',
  label2 = 'Land',
}: Props) {
  const W = mode === 'single' ? 280 : 190
  const H = 84
  const r = 36
  const scale = height / H
  const svgW = Math.round(W * scale)
  const svgH = Math.round(H * scale)
  const text = `${label1}${mode === 'single' ? ' ' + label2 : ''}`

  // single-line matrix string to avoid SSR/CSR whitespace diffs
  const INNER_SHADOW_MATRIX =
    '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0'

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label1} ${label2}`}
      style={{ display: 'block' }}
    >
      <defs>
        {/* minty gradient */}
        <linearGradient id="capsule" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#58d6b7" />
          <stop offset="100%" stopColor="#3ab7a7" />
        </linearGradient>

        {/* inner shadow — apply only to capsule */}
        <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="2" result="b" />
          <feComposite in2="b" in="SourceGraphic" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values={INNER_SHADOW_MATRIX} />
        </filter>

        {/* subtle outer glow of the edge */}
        <filter id="edgeGlow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.2" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* safe white text shadow */}
        <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* capsule */}
      <g filter="url(#edgeGlow)">
        <rect
          x="2"
          y="2"
          rx={r}
          ry={r}
          width={W - 4}
          height={H - 4}
          fill="url(#capsule)"
          filter="url(#innerShadow)"
        />
        <rect x="2" y="2" rx={r} ry={r} width={W - 4} height={H - 4} fill="none" stroke="#0b0b0f" strokeWidth={6} />
        <rect
          x="2"
          y="2"
          rx={r}
          ry={r}
          width={W - 4}
          height={H - 4}
          fill="none"
          stroke="rgba(255,255,255,.18)"
          strokeWidth={1.5}
        />
      </g>

      {/* sparkles */}
      <g fill="rgba(220,255,240,.9)">
        <circle cx={W - 36} cy={16} r="1.8" />
        <circle cx={W - 24} cy={28} r="1.1" />
        <circle cx={W - 50} cy={20} r="1.1" />
      </g>

      {/* text */}
      {mode === 'single' ? (
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          stroke="#0b0b0f"
          strokeWidth={6}
          strokeLinejoin="round"
          paintOrder="stroke fill"
          filter="url(#textShadow)"
          style={{
            fontFamily: `'Fredoka','Baloo 2','Nunito',ui-rounded,system-ui,sans-serif`,
            fontWeight: 900,
            fontSize: 44,
            letterSpacing: 0.7,
          }}
        >
          {text}
        </text>
      ) : (
        <>
          <text
            x="50%"
            y="38%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            stroke="#0b0b0f"
            strokeWidth={6}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            filter="url(#textShadow)"
            style={{
              fontFamily: `'Fredoka','Baloo 2','Nunito',ui-rounded,system-ui,sans-serif`,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            {label1}
          </text>
          <text
            x="50%"
            y="74%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            stroke="#0b0b0f"
            strokeWidth={6}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            filter="url(#textShadow)"
            style={{
              fontFamily: `'Fredoka','Baloo 2','Nunito',ui-rounded,system-ui,sans-serif`,
              fontWeight: 900,
              fontSize: 32,
            }}
          >
            {label2}
          </text>
        </>
      )}
    </svg>
  )
}