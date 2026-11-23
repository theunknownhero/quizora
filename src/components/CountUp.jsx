// Count up when visible (inspired by React Bits "CountUp").
import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'motion/react'

export default function CountUp({ to, suffix = '', duration = 2 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { damping: 30 + duration * 10, stiffness: 100 / duration })
  useEffect(() => {
    if (inView) mv.set(to)
  }, [inView, mv, to])
  useEffect(
    () =>
      spring.on('change', (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('en-US') + suffix
      }),
    [spring, suffix]
  )
  return <span ref={ref}>0{suffix}</span>
}
