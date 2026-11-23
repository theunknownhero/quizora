// Marquee that speeds up with scroll (inspired by React Bits "ScrollVelocity").
import { useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'motion/react'

const wrap = (min, max, v) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

function Row({ children, baseVelocity }) {
  const base = useMotionValue(0)
  const { scrollY } = useScroll()
  const vel = useVelocity(scrollY)
  const smooth = useSpring(vel, { damping: 50, stiffness: 400 })
  const factor = useTransform(smooth, [0, 1000], [0, 5], { clamp: false })
  const x = useTransform(base, (v) => `${wrap(-25, 0, v)}%`)
  const dir = useRef(1)
  useAnimationFrame((_, delta) => {
    let move = dir.current * baseVelocity * (delta / 1000)
    if (factor.get() < 0) dir.current = -1
    else if (factor.get() > 0) dir.current = 1
    move += dir.current * move * factor.get()
    base.set(base.get() + move)
  })
  return (
    <div className="marquee-row">
      <motion.div className="marquee-track" style={{ x }}>
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className="marquee-chunk" aria-hidden={k > 0}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export default function ScrollVelocity({ rows }) {
  return (
    <div className="marquee">
      {rows.map((r, i) => (
        <Row key={i} baseVelocity={i % 2 ? -2 : 2}>
          {r}
        </Row>
      ))}
    </div>
  )
}
