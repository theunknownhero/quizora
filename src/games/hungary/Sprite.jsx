import { spriteSizes } from './spriteSizes.js'

export const spriteUrl = (n) => `/games/hungary/sprites/${n}.png`

// Positioned by center-x / bottom-y, in parent (world/local) units.
export default function Sprite({ n, x, y, s = 1, flip, className = '', style, anchor = 'bottom' }) {
  const [w, h] = spriteSizes[n] || [100, 100]
  const W = w * s
  const H = h * s
  const top = anchor === 'top' ? y : y - H
  return (
    <img
      src={spriteUrl(n)}
      alt=""
      draggable="false"
      className={`sprite ${className}`}
      style={{ left: x - W / 2, top, width: W, height: H, transform: flip ? 'scaleX(-1)' : undefined, ...style }}
    />
  )
}
