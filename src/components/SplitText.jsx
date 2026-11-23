// Letter-by-letter reveal (inspired by React Bits "SplitText").
import { Fragment } from 'react'
import { motion } from 'motion/react'

export default function SplitText({ text, className = '', delay = 0, stagger = 0.035, as: Tag = 'span' }) {
  const words = text.split(' ')
  let i = 0
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, wi) => (
        <Fragment key={wi}>
        <span className="split-word" aria-hidden="true">
          {[...w].map((ch) => {
            const d = delay + i++ * stagger
            return (
              <motion.span
                key={d}
                className="split-char"
                initial={{ opacity: 0, y: '0.6em', filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: d, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {ch}
              </motion.span>
            )
          })}
        </span>
        {wi < words.length - 1 && ' '}
        </Fragment>
      ))}
    </Tag>
  )
}
