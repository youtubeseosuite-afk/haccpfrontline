// File Path: /src/components/compliance/ComplianceScoreBar.tsx
// Status: NEW FILE
// Description: Presentational compliance score bar. Colour reflects
//              severity: red under 50%, amber 50-84%, green 85%+.

export function ComplianceScoreBar({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage))
  const color = clamped >= 85 ? '#2e7d32' : clamped >= 50 ? '#f9a825' : '#c62828'

  return (
    <div style={{ background: '#eee', borderRadius: 4, height: 10, overflow: 'hidden' }}>
      <div
        style={{
          width: `${clamped}%`,
          background: color,
          height: '100%',
        }}
      />
    </div>
  )
}
