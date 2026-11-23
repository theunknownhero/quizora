// Word blur-in on scroll (inspired by React Bits "BlurText").
import { motion } from 'motion/react'

export default function BlurText({ text, className = '', as: Tag = 'h2' }) {
  return (
    <Tag className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ display: 'inline-block', marginRight: '0.25em' }}
          initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
          whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
        >
          {w}
        </motion.span>
      ))}
    </Tag>
  )
}
