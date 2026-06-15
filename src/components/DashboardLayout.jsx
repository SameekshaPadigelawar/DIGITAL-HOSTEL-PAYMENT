import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import { Icons } from './Icons';

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function DashboardLayout({ title, subtitle, navItems, activeTab, onTabChange, children }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isOwner = user.role === 'owner';

  return (
    <div className="dashboard-shell">
      <Navbar />
      <div className="dashboard-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-profile">
            <div className="avatar">{getInitials(user.name)}</div>
            <div className="sidebar-profile-text">
              <p className="sidebar-name">{user.name}</p>
              <span className={`role-pill role-pill-${user.role}`}>
                {isOwner ? 'Owner' : 'Tenant'}
              </span>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Dashboard navigation">
            <p className="sidebar-section-label">{isOwner ? 'Management' : 'Account'}</p>
            <ul>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={isActive ? 'active' : ''}
                      onClick={() => {
                        onTabChange(item.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <span className="nav-icon-wrap">
                        <Icon size={18} />
                      </span>
                      <span className="nav-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
          {children}
        </main>
      </div>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <Icons.Menu size={22} />
      </button>
    </div>
  );
}
