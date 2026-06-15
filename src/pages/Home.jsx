import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Icons } from '../components/Icons';

const features = [
  { icon: Icons.Chart, tint: 'indigo', title: 'Owner Dashboard', desc: 'Track revenue, received amounts, pending dues, and defaulters from a single control panel.' },
  { icon: Icons.Qr, tint: 'cyan', title: 'QR & Digital Payments', desc: 'Tenants pay via UPI QR codes and upload payment proof for fast owner verification.' },
  { icon: Icons.Shield, tint: 'violet', title: 'Fraud Detection', desc: 'Duplicate payment screenshots are flagged automatically so owners can review suspicious uploads.' },
  { icon: Icons.Bell, tint: 'amber', title: 'Payment Reminders', desc: 'Send reminders to tenants with outstanding dues and reduce manual follow-ups.' },
  { icon: Icons.Bed, tint: 'green', title: 'Room & Sharing Types', desc: 'Configure single, double, triple, or quad sharing with floor and room-level tracking.' },
  { icon: Icons.Message, tint: 'rose', title: 'Complaint Management', desc: 'Tenants submit maintenance issues directly; owners stay informed and respond faster.' },
];

const stats = [
  { label: 'Expected Revenue', value: '₹2,00,000' },
  { label: 'Received', value: '₹1,68,000' },
  { label: 'Pending Dues', value: '₹32,000' },
  { label: 'Defaulters', value: '4' },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <p className="eyebrow">Hostel Fee Management Platform</p>
            <h1>Manage hostel rent collection with <span className="text-accent">confidence</span></h1>
            <p className="hero-lead">
              Replace manual tracking with a secure platform for payments, tenant records,
              reminders, and real-time financial visibility.
            </p>
            <div className="hero-actions">
              <Link to="/register/owner" className="btn btn-primary btn-lg">Register as Owner</Link>
              <Link to="/register/tenant" className="btn btn-secondary btn-lg">Register as Tenant</Link>
            </div>
            <ul className="hero-points">
              <li><Icons.Lock size={16} /> Secure payment records</li>
              <li><Icons.Zap size={16} /> Real-time dues tracking</li>
              <li><Icons.Trending size={16} /> Financial insights</li>
            </ul>
          </div>

          <div className="hero-panel">
            <div className="hero-panel__head">
              <span>Monthly Summary</span>
              <span className="badge badge--live">Live</span>
            </div>
            <div className="hero-panel__body">
              {stats.map((s) => (
                <div key={s.label} className="hero-panel__row">
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section features-section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Capabilities</p>
            <h2>Built for owners and tenants</h2>
            <p>Role-based dashboards with transparent payment workflows and hostel-level organization.</p>
          </div>
          <div className="features-grid">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="feature-card">
                  <div className={`feature-card__icon feature-card__icon--${f.tint}`}><Icon size={22} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-box">
          <div>
            <h2>Start digitizing your hostel today</h2>
            <p>Set up your hostel in minutes and invite tenants to register under your property.</p>
          </div>
          <Link to="/login" className="btn btn-white btn-lg">Sign In</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <div className="logo-mark"><Icons.Home size={16} /></div>
            <span>HostelPay</span>
          </div>
          <p>&copy; 2026 HostelPay. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
