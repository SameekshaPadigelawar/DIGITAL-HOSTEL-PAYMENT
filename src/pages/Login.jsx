import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('tenant');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email.trim(), password, role);
    if (result.success) {
      navigate(role === 'owner' ? '/owner' : '/tenant');
    } else {
      setError(result.message);
    }
  };

  return (
    <>
      <Navbar minimal />
      <div className="auth-page">
        <div className="auth-split">
          <div className="auth-aside">
            <p className="eyebrow">Sign in</p>
            <h2>Access your dashboard</h2>
            <p>Manage payments, tenants, reminders, and hostel settings from one secure workspace.</p>
            <ul className="auth-benefits">
              <li>Role-based owner and tenant access</li>
              <li>QR payments and proof uploads</li>
              <li>Real-time dues and defaulter tracking</li>
            </ul>
          </div>

          <div className="auth-card">
            <h1>Welcome back</h1>
            <p className="subtitle">Enter your credentials to continue</p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Account type</label>
                <div className="auth-tabs">
                  <button
                    type="button"
                    className={`auth-tab ${role === 'tenant' ? 'active' : ''}`}
                    onClick={() => setRole('tenant')}
                  >
                    Tenant
                  </button>
                  <button
                    type="button"
                    className={`auth-tab ${role === 'owner' ? 'active' : ''}`}
                    onClick={() => setRole('owner')}
                  >
                    Owner
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block">Sign in</button>
            </form>

            <div className="auth-footer">
              <p>
                No account? <Link to="/register/tenant">Tenant</Link>
                {' · '}
                <Link to="/register/owner">Owner</Link>
              </p>
              <p className="demo-hint">
                Demo — Owner: owner@hostelpay.com / owner123 · Tenant: priya@email.com / tenant123
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
