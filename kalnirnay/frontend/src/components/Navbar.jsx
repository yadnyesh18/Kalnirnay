export default function Navbar({ onSubscribe }) {
  return (
    <nav className="navbar">
      <a className="navbar-logo" href="/">
        <div className="logo-icon">📅</div>
        <span className="logo-name">Kaal<span>nirnay</span></span>
      </a>
      <div className="navbar-right">
        <span className="nav-tag">SE_A_06</span>
        <button className="btn btn-primary" onClick={onSubscribe}>
          Get Notified
        </button>
      </div>
    </nav>
  )
}
