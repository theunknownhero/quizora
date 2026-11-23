// Cycling word with per-letter stagger (inspired by React Bits "RotatingText").
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export default function RotatingText({ words, interval = 2200, className = '' }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words.length, interval])
  return (
    <span className={`rotating ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={words[i]} className="rotating-inner">
          {[...words[i]].map((ch, k) => (
            <motion.span
              key={k}
              style={{ display: 'inline-block', whiteSpace: 'pre' }}
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-120%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 400, delay: k * 0.025 }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
