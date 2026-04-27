export default function Navbar({ user, onLogin, onLogout, onProfileOpen }) {
  const displayName = user?.full_name
    ? user.full_name.split(' ')[0]
    : user?.username || user?.email?.split('@')[0] || '??'
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <nav className="navbar">
      <a className="navbar-logo" href="/">
        <div className="logo-icon">📅</div>
        <span className="logo-name">Kaal<span>nirnay</span></span>
      </a>
      <div className="navbar-right">
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
