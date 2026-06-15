const VARIANTS = {
  revenue: 'stat-card--blue',
  received: 'stat-card--green',
  pending: 'stat-card--amber',
  defaulters: 'stat-card--red',
};

export default function StatCard({ label, value, icon, variant }) {
  return (
    <div className={`stat-card ${VARIANTS[variant] || ''}`}>
      <div className="stat-card__header">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon">{icon}</span>
      </div>
      <div className="stat-card__value">{value}</div>
    </div>
  );
}
