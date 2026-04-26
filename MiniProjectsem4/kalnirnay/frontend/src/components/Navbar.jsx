export default function Navbar({ user, onLogin, onLogout, onProfileOpen, isDark, onThemeToggle }) {
  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.username || user?.email?.split('@')[0] || '??'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <nav className="navbar">
      <a className="navbar-logo" href="/">
        <span className="logo-name">Kaal<span>nirnay</span></span>
      </a>
      <div className="navbar-right">
        <button className="theme-toggle" onClick={onThemeToggle} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          <span className="theme-toggle-track">
            <span className="theme-toggle-thumb">
              {isDark ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </span>
          </span>
        </button>
        {user ? (
          <>
            <button className="nav-profile-btn" onClick={onProfileOpen} title="Profile">
              <div className="nav-avatar">{initials}</div>
              <span className="nav-username">{displayName}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onLogin}>Login</button>
        )}
      </div>
    </nav>
  )
}
