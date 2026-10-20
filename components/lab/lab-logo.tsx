"use client"

import { useId, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

interface LabLogoProps {
  size?: number
  /** Optional override — if omitted, uses the app's primary/chart-2 CSS variables. */
  accent?: string
  animated?: boolean
  intro?: boolean
  className?: string
}

/**
 * DR ISMAIL LAB — "Aperture Bloom"
 *
 * By default the petals use the app's theme colors:
 *   --primary   (deep blue)   → outer petal stroke + gradient
 *   --chart-2   (mid blue)    → inner petal stroke + jewel
 *
 * Pass `accent="#FFFFFF"` to force white petals (e.g. on a blue header).
 */
export function LabLogo({
  size = 48,
  accent,
  animated = true,
  intro = true,
  className,
}: LabLogoProps) {
  const uid = useId().replace(/[:]/g, "")
  const ref = (n: string) => `bloom-${uid}-${n}`
  const skipMotion = !animated

  const petalDelays = [0.20, 0.35, 0.50, 0.65, 0.80, 0.95, 1.10, 1.25, 1.40, 1.55, 1.70, 1.85]

  // Themed vs. override
  const outerStroke = accent ?? "var(--primary)"
  const innerStroke = accent ?? "var(--chart-2)"
  const jewelColor  = accent ?? "var(--chart-2)"
  const gradTop     = accent ?? "var(--primary)"
  const gradBottom  = accent ?? "var(--chart-2)"

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn(className, skipMotion && "bloom-static")}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <linearGradient id={ref("grad")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={gradTop} stopOpacity="0.55" />
          <stop offset="1" stopColor={gradBottom} stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <style>{`
        @keyframes bloom-wrap-intro {
          0%   { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes bloom-wrap-idle {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.015); }
        }
        @keyframes bloom-petal-intro {
          0%   { transform: rotate(0deg)     scale(0.3); opacity: 0; }
          100% { transform: rotate(var(--a)) scale(1);   opacity: 1; }
        }
        @keyframes bloom-core-intro {
          0%   { transform: scale(0);   opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes bloom-core-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.4); }
        }

        .bloom-wrap {
          transform-origin: 150px 150px;
          transform-box: view-box;
          will-change: transform, opacity;
        }
        .bloom-wrap--intro {
          animation:
            bloom-wrap-intro 1.0s cubic-bezier(0.16, 1, 0.3, 1) forwards,
            bloom-wrap-idle 4s ease-in-out 1.8s infinite;
        }
        .bloom-wrap--idle { animation: bloom-wrap-idle 4s ease-in-out infinite; }

        .bloom-petal {
          transform-origin: 150px 150px;
          transform-box: view-box;
          will-change: transform, opacity;
        }
        .bloom-petal--intro {
          opacity: 0;
          animation: bloom-petal-intro 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .bloom-petal--idle { transform: rotate(var(--a)); opacity: 1; }

        .bloom-core {
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform;
        }
        .bloom-core--intro {
          animation:
            bloom-core-intro 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1.6s forwards,
            bloom-core-pulse 3.5s ease-in-out 2.1s infinite;
        }
        .bloom-core--idle { animation: bloom-core-pulse 3.5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .bloom-wrap--intro, .bloom-wrap--idle,
          .bloom-petal--intro, .bloom-petal--idle,
          .bloom-core--intro, .bloom-core--idle { animation: none !important; }
          .bloom-petal { transform: rotate(var(--a)); opacity: 1; }
          .bloom-wrap  { opacity: 1; transform: none; }
          .bloom-core  { opacity: 1; transform: none; }
        }
        html.perf-eco .bloom-wrap--intro,
        html.perf-eco .bloom-wrap--idle,
        html.perf-eco .bloom-petal--intro,
        html.perf-eco .bloom-petal--idle,
        html.perf-eco .bloom-core--intro,
        html.perf-eco .bloom-core--idle { animation: none !important; }
        html.perf-eco .bloom-petal { transform: rotate(var(--a)); opacity: 1; }
        html.perf-eco .bloom-wrap  { opacity: 1; transform: none; }
        html.perf-eco .bloom-core  { opacity: 1; transform: none; }

        .bloom-static .bloom-wrap--intro,
        .bloom-static .bloom-wrap--idle,
        .bloom-static .bloom-petal--intro,
        .bloom-static .bloom-petal--idle,
        .bloom-static .bloom-core--intro,
        .bloom-static .bloom-core--idle { animation: none !important; }
        .bloom-static .bloom-petal { transform: rotate(var(--a)); opacity: 1; }
        .bloom-static .bloom-wrap  { opacity: 1; transform: none; }
        .bloom-static .bloom-core  { opacity: 1; transform: none; }
      `}</style>

      <g className={cn("bloom-wrap", intro ? "bloom-wrap--intro" : "bloom-wrap--idle")}>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <path
            key={`o-${deg}`}
            className={cn("bloom-petal", intro ? "bloom-petal--intro" : "bloom-petal--idle")}
            style={{ "--a": `${deg}deg`, animationDelay: intro ? `${petalDelays[i]}s` : undefined } as CSSProperties}
            d="M150 150 C124 118 124 68 150 36 C176 68 176 118 150 150Z"
            fill={`url(#${ref("grad")})`}
            stroke={outerStroke}
            strokeWidth="1.8"
          />
        ))}
        {[30, 90, 150, 210, 270, 330].map((deg, i) => (
          <path
            key={`i-${deg}`}
            className={cn("bloom-petal", intro ? "bloom-petal--intro" : "bloom-petal--idle")}
            style={{ "--a": `${deg}deg`, animationDelay: intro ? `${petalDelays[i + 6]}s` : undefined } as CSSProperties}
            d="M150 150 C138 134 138 110 150 90 C162 110 162 134 150 150Z"
            fill="none"
            stroke={innerStroke}
            strokeWidth="1.4"
          />
        ))}
        <circle
          className={cn("bloom-core", intro ? "bloom-core--intro" : "bloom-core--idle")}
          cx="150" cy="150" r="5"
          fill={jewelColor}
        />
      </g>
    </svg>
  )
}