import { useEffect, useState } from 'react'
import './Splash.css'

export default function Splash({ onDone }) {
  const [out, setOut] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 2000)
    const t2 = setTimeout(() => onDone(), 2600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`splash ${out ? 'splash-out' : ''}`}>
      <div className="splash-orb s-orb1" />
      <div className="splash-orb s-orb2" />
      <div className="splash-orb s-orb3" />

      <div className="splash-center">
        <div className="splash-ring" />
        <div className="splash-logo">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
      </div>

      <div className="splash-name">Kalnirnay</div>
      <div className="splash-tagline">Smart Event Intelligence</div>
    </div>
  )
}
