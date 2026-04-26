import { useEffect, useState } from 'react'
import './Splash.css'

export default function Splash({ onDone }) {
  const [out, setOut] = useState(false)
  const [text, setText] = useState("")
  const target = "KAALNIRNAY"

  useEffect(() => {
    // Decoding text effect
    let iter = 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%*";
    const interval = setInterval(() => {
      setText(target.split("").map((char, i) => {
        if(i < iter) return target[i];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""))
      iter += 1/3;
      if (iter >= target.length) clearInterval(interval);
    }, 40);

    const t1 = setTimeout(() => setOut(true), 2100)
    const t2 = setTimeout(() => onDone(), 2500)
    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className={`splash ${out ? 'splash-out' : ''}`}>
      <div className="splash-grid"></div>
      <div className="splash-content">
        <svg className="splash-icon-anim" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
          <rect className="draw-path delay-0" x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line className="draw-path delay-1" x1="16" y1="2" x2="16" y2="6"></line>
          <line className="draw-path delay-1" x1="8" y1="2" x2="8" y2="6"></line>
          <line className="draw-path delay-2" x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <h1 className="splash-title-glitch">{text}</h1>
        <div className="splash-progress">
          <div className="splash-bar"></div>
        </div>
      </div>
    </div>
  )
}
