// Magnetic pull toward cursor (inspired by React Bits "Magnet").
import { motion, useMotionValue, useSpring } from 'motion/react'

export default function Magnet({ children, strength = 0.3, className = '' }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 250, damping: 15 })
  const sy = useSpring(y, { stiffness: 250, damping: 15 })
  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy, display: 'inline-block' }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
