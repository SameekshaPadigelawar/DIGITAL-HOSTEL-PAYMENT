const defaults = { size: 20, className: '' };

function Icon({ children, size, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Icons = {
  Home: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
    </Icon>
  ),
  Chart: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M4 20V10M12 20V4M20 20v-6" />
    </Icon>
  ),
  Users: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </Icon>
  ),
  Card: (p) => (
    <Icon {...defaults} {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Icon>
  ),
  Bell: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </Icon>
  ),
  Settings: (p) => (
    <Icon {...defaults} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Icon>
  ),
  Message: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </Icon>
  ),
  User: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  ),
  Building: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18" />
      <path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </Icon>
  ),
  Qr: (p) => (
    <Icon {...defaults} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h2v2h-2zM20 14h1v1h-1zM14 20h2v1h-2zM20 17h1v1h-1zM17 17h1v1h-1zM17 20h1v1h-1zM20 20h1v1h-1z" />
    </Icon>
  ),
  Shield: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  ),
  Search: (p) => (
    <Icon {...defaults} {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </Icon>
  ),
  Bed: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M2 9V5a2 2 0 012-2h16a2 2 0 012 2v4" />
      <path d="M2 11v8M22 11v8" />
      <path d="M2 15h20" />
    </Icon>
  ),
  Trending: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </Icon>
  ),
  Wallet: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5" />
      <path d="M16 12h4" />
    </Icon>
  ),
  Check: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M20 6L9 17l-5-5" />
    </Icon>
  ),
  Clock: (p) => (
    <Icon {...defaults} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </Icon>
  ),
  Alert: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </Icon>
  ),
  Upload: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5M12 3v12" />
    </Icon>
  ),
  Menu: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  ),
  Zap: (p) => (
    <Icon {...defaults} {...p}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Icon>
  ),
  Lock: (p) => (
    <Icon {...defaults} {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </Icon>
  ),
};
