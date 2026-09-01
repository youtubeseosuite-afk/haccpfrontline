// File Path: /src/components/compliance/ComplianceDonut.tsx
// Status: NEW FILE
// Description: SVG donut chart for a compliance percentage. Colour reflects
// severity (red under 50%, amber 50-84%, green 85%+), matching the
// "Trust & Precision" status palette. Plain SVG stroke-dasharray — no chart
// library, so no new dependency is needed. Replaces ComplianceScoreBar for
// the Control Tower's central score; ComplianceScoreBar itself is now
// unused and can be deleted whenever convenient.

export function ComplianceDonut({
  percentage,
  size = 160,
  strokeWidth = 14,
  label,
}: {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, percentage))
  const color = clamped >= 85 ? '#16a34a' : clamped >= 50 ? '#d97706' : '#dc2626'

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-900 text-2xl font-semibold"
        >
          {clamped}%
        </text>
      </svg>
      {label && <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>}
    </div>
  )
}
