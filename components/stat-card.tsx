export function StatCard({ label, value, sub, tone = "default" }: { label: string; value: string; sub: string; tone?: "default" | "green" | "amber" }) {
  return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}
