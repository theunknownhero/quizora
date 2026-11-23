// Sparks burst on click anywhere (inspired by React Bits "ClickSpark").
import { useEffect, useRef } from 'react'

export default function ClickSpark({ color = '#c4b5fd', count = 8, radius = 22 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c.getContext('2d')
    let sparks = []
    let raf
    const resize = () => {
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    resize()
    const click = (e) => {
      const now = performance.now()
      for (let i = 0; i < count; i++) sparks.push({ x: e.clientX, y: e.clientY, a: (2 * Math.PI * i) / count, t: now })
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const draw = (now) => {
      ctx.clearRect(0, 0, c.width, c.height)
      sparks = sparks.filter((s) => {
        const p = (now - s.t) / 450
        if (p >= 1) return false
        const e = p * (2 - p)
        const d = e * radius
        const len = 10 * (1 - e)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(s.x + d * Math.cos(s.a), s.y + d * Math.sin(s.a))
        ctx.lineTo(s.x + (d + len) * Math.cos(s.a), s.y + (d + len) * Math.sin(s.a))
        ctx.stroke()
        return true
      })
      raf = sparks.length ? requestAnimationFrame(draw) : null
    }
    window.addEventListener('resize', resize)
    window.addEventListener('click', click)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('click', click)
      cancelAnimationFrame(raf)
    }
  }, [color, count, radius])
  return <canvas ref={ref} className="click-spark" aria-hidden="true" />
}
