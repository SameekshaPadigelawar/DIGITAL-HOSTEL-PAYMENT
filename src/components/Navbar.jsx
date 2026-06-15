import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';

export default function Navbar({ minimal }) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          <div className="logo-mark"><Icons.Home size={18} /></div>
          <span>HostelPay</span>
        </Link>
        <ul className="nav-links">
          {isAuthenticated ? (
            <>
              <li>
                <Link to={user.role === 'owner' ? '/owner' : '/tenant'} className="nav-link">
                  Dashboard
                </Link>
              </li>
              <li>
                <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                  Logout
                </button>
              </li>
            </>
          ) : (
            !minimal && (
              <>
                <li><Link to="/login" className="nav-link">Login</Link></li>
                <li><Link to="/register/tenant" className="nav-link">Tenant Sign Up</Link></li>
                <li>
                  <Link to="/register/owner" className="btn btn-primary btn-sm">
                    Owner Sign Up
                  </Link>
                </li>
              </>
            )
          )}
        </ul>
      </div>
    </nav>
  );
}
