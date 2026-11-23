// Mouse-following spotlight card (inspired by React Bits "SpotlightCard").
import { useRef } from 'react'

export default function SpotlightCard({ children, className = '', color = 'rgba(167,139,250,0.22)', ...rest }) {
  const ref = useRef(null)
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`)
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <div ref={ref} onMouseMove={move} className={`spotlight-card ${className}`} style={{ '--spot': color }} {...rest}>
      {children}
    </div>
  )
}
