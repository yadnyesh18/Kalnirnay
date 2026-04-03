export default function Navbar({ user, onLogin, onLogout }) {
  return (
    <nav className="navbar">
      <a className="navbar-logo" href="/">
        <div className="logo-icon">📅</div>
        <span className="logo-name">Kaal<span>nirnay</span></span>
      </a>
      <div className="navbar-right">
        {user ? (
          <>
            <span className="nav-tag">@{user.username}</span>
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onLogin}>
            Login
          </button>
        )}
      </div>
    </nav>
  )
}
