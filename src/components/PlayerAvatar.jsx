// Round avatar with the player's initial, level chip and optional online dot.
import { tierFor } from '../lib/levels.js'

export default function PlayerAvatar({ username = '?', level = 1, online, size = 44, showLevel = true }) {
  const tier = tierFor(level)
  return (
    <span className="pav" style={{ '--s': `${size}px`, '--tier': tier.color }} aria-hidden="true">
      <span className="pav-in">{username[0]?.toUpperCase()}</span>
      {showLevel && <i className="pav-lvl">{level}</i>}
      {online !== undefined && <b className={`pav-dot ${online ? 'is-on' : ''}`} />}
    </span>
  )
}
