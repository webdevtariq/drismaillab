"use client"

import { cn } from "@/lib/utils"

interface DILogoProps {
  size?: number
  accent?: string
  animated?: boolean
  className?: string
}

/**
 * DR ISMAIL LAB — "DI Monogram" (navbar version)
 *
 * Elegant serif "DI" inside a thin double ring with a small cyan dot.
 * Only the dot pulses. Everything else is still — clean, premium, quiet.
 */
export function DILogo({
  size = 48,
  accent = "#38BDF8",
  animated = true,
  className,
}: DILogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn(className, !animated && "di-static")}
      style={{ overflow: "visible", display: "block" }}
    >
      <style>{`
        @keyframes di-dot-pulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.7); }
        }
        .di-dot {
          transform-box: fill-box;
          transform-origin: center;
          animation: di-dot-pulse 3.5s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .di-static .di-dot { animation: none !important; opacity: 0.9; }
        @media (prefers-reduced-motion: reduce) {
          .di-dot { animation: none !important; }
        }
        html.perf-eco .di-dot { animation: none !important; }
      `}</style>

      {/* Outer ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" />

      {/* Inner hairline */}
      <circle cx="50" cy="50" r="37" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.38" />

      {/* DI monogram */}
      <text
        x="50" y="63"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', 'Playfair Display', serif"
        fontSize="40"
        fontStyle="italic"
        fontWeight="400"
        fill="currentColor"
        letterSpacing="-3"
      >
        DI
      </text>

      {/* Cyan accent dot */}
      <circle className="di-dot" cx="80" cy="20" r="3.4" fill={accent} />
    </svg>
  )
}