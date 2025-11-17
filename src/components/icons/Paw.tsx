'use client'

export default function Paw({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g fill="#0b0b0f"><ellipse cx="32" cy="42" rx="16" ry="13"/></g>
      <g fill="#fff"><ellipse cx="32" cy="42" rx="13" ry="10"/></g>
      <g fill="#0b0b0f">
        <circle cx="16" cy="25" r="7"/><circle cx="32" cy="22" r="7"/><circle cx="48" cy="25" r="7"/>
      </g>
      <g fill="#fff">
        <circle cx="16" cy="25" r="5.2"/><circle cx="32" cy="22" r="5.2"/><circle cx="48" cy="25" r="5.2"/>
      </g>
    </svg>
  )
}