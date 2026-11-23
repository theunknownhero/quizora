// Vector island terrain (grass top + rocky cliff), water, vineyards, roads and stairs.
// Drawn as SVG so the big islands stay crisp at any size; building sprites sit on top.
import { memo } from 'react'
import { WORLD_W, WORLD_H, islands } from './layout.js'

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n) => n.toFixed(1)

// Smooth closed path through points (midpoint quadratic)
function closedPath(pts) {
  const n = pts.length
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M${f(mid(pts[n - 1], pts[0])[0])},${f(mid(pts[n - 1], pts[0])[1])}`
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n])
    d += ` Q${f(pts[i][0])},${f(pts[i][1])} ${f(m[0])},${f(m[1])}`
  }
  return d + 'Z'
}

// Open smooth path (Catmull-Rom)
export function openPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const t = 0.2
    d += ` C${f(p1[0] + (p2[0] - p0[0]) * t)},${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)},${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])},${f(p2[1])}`
  }
  return d
}

function islandShape(isl) {
  const r = rng(isl.seed)
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28]
  const N = 72
  const top = []
  for (let k = 0; k < N; k++) {
    const t = (k / N) * Math.PI * 2
    const wob = 1 + 0.035 * Math.sin(3 * t + ph[0]) + 0.025 * Math.sin(5 * t + ph[1]) + 0.012 * Math.sin(11 * t + ph[2])
    top.push([isl.cx + isl.rx * wob * Math.cos(t), isl.cy + isl.ry * wob * Math.sin(t)])
  }
  // front half: t in [0, PI] (sin >= 0), right -> left
  const front = top.slice(0, N / 2 + 1)
  const bottom = front.map((p, k) => {
    const s = Math.sin((k / (N / 2)) * Math.PI)
    const jag = k % 2 ? 6 + r() * 26 : r() * 8
    return [p[0] + (r() - 0.5) * 6, p[1] + 14 + isl.depth * (0.25 + 0.75 * s) * (0.75 + r() * 0.35) + jag * s]
  })
  const cliff =
    `M${f(front[0][0])},${f(front[0][1])} ` +
    front.map((p) => `L${f(p[0])},${f(p[1])}`).join(' ') +
    ' ' +
    [...bottom].reverse().map((p) => `L${f(p[0])},${f(p[1])}`).join(' ') +
    'Z'
  const strata = [0.35, 0.62].map((q) =>
    'M' + front.map((p, k) => `${f(p[0])},${f(p[1] + (bottom[k][1] - p[1]) * q + (r() - 0.5) * 6)}`).join(' L')
  )
  // grass patches
  const patches = Array.from({ length: 9 }, () => {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.75
    return { x: isl.cx + Math.cos(a) * isl.rx * d, y: isl.cy + Math.sin(a) * isl.ry * d, rx: 40 + r() * 70, ry: 14 + r() * 22, light: r() > 0.45 }
  })
  return { top: closedPath(top), cliff, strata, patches }
}

function Lake({ isl, ft, id }) {
  const cx = isl.cx + ft.dx
  const cy = isl.cy + ft.dy
  const r = rng(isl.seed + 7)
  const pts = Array.from({ length: 28 }, (_, k) => {
    const t = (k / 28) * Math.PI * 2
    const w = 1 + 0.07 * Math.sin(3 * t + r() * 3) + 0.04 * Math.sin(5 * t)
    return [cx + ft.rx * w * Math.cos(t), cy + ft.ry * w * Math.sin(t)]
  })
  const d = closedPath(pts)
  return (
    <g>
      <path d={d} fill="#f1d9a2" transform="translate(0,3) scale(1)" stroke="#f1d9a2" strokeWidth="14" />
      <path d={d} fill={`url(#${id}-water)`} />
      {[0, 1, 2, 3].map((k) => (
        <path
          key={k}
                    d={`M${cx - ft.rx * 0.6 + k * 70},${cy - 10 + (k % 2) * 22} q12,-6 24,0 t24,0`}
          stroke="rgba(255,255,255,.7)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
                  />
      ))}
    </g>
  )
}

function River({ isl, ft, id }) {
  const pts = ft.pts.map(([dx, dy]) => [isl.cx + dx, isl.cy + dy])
  const d = openPath(pts)
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke="#f1d9a2" strokeWidth={ft.w + 14} />
      <path d={d} stroke={`url(#${id}-water)`} strokeWidth={ft.w} />
      <path d={d} stroke="rgba(255,255,255,.65)" strokeWidth="3" strokeDasharray="10 26" />
    </g>
  )
}

function Vines({ isl, ft }) {
  const x0 = isl.cx + ft.x
  const y0 = isl.cy + ft.y
  return (
    <g>
      {Array.from({ length: ft.rows }, (_, k) => {
        const y = y0 + (k * ft.h) / Math.max(1, ft.rows - 1)
        const d = `M${x0},${y} q${ft.w / 2},-10 ${ft.w},0`
        return (
          <g key={k}>
            <path d={d} stroke="#4f8f2b" strokeWidth="11" strokeLinecap="round" fill="none" />
            <path d={d} stroke="#9bd04a" strokeWidth="5" strokeLinecap="round" fill="none" strokeDasharray="3 9" />
            <path d={d} stroke="#f2cf3c" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="1 23" />
          </g>
        )
      })}
    </g>
  )
}

function Terrain() {
  const shapes = islands.map(islandShape)
  const order = [...islands].reverse() // top (far) first, bottom (near) last
  return (
    <svg className="terrain" width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true">
      <defs>
        <linearGradient id="t-cliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4a2a" />
          <stop offset="0.25" stopColor="#b8683b" />
          <stop offset="1" stopColor="#6a3520" />
        </linearGradient>
        <linearGradient id="t-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8db55" />
          <stop offset="1" stopColor="#74bb3c" />
        </linearGradient>
        <linearGradient id="t-snow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8e9f7" />
        </linearGradient>
        <linearGradient id="t-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6fdcff" />
          <stop offset="1" stopColor="#1f8fe0" />
        </linearGradient>
        <filter id="t-shadow" x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="26" stdDeviation="18" floodColor="#0a1238" floodOpacity="0.45" />
        </filter>
      </defs>

      {order.map((isl) => {
        const sh = shapes[isl.i]
        const road = isl.road.map(([dx, dy]) => [isl.cx + dx, isl.cy + dy])
        const roadD = openPath(road)
        return (
          <g key={isl.i}>
            <g filter="url(#t-shadow)">
              <path d={sh.cliff} fill="url(#t-cliff)" />
            </g>
            {sh.strata.map((d, k) => (
              <path key={k} d={d} fill="none" stroke="rgba(60,25,10,.28)" strokeWidth="3" strokeLinecap="round" />
            ))}
            <path d={sh.top} fill={isl.snow ? '#a9c9e4' : '#4f9a2c'} transform="translate(0,9)" />
            <path d={sh.top} fill={isl.snow ? 'url(#t-snow)' : 'url(#t-grass)'} />
            {sh.patches.map((p, k) => (
              <ellipse
                key={k}
                cx={p.x}
                cy={p.y}
                rx={p.rx}
                ry={p.ry}
                fill={isl.snow ? (p.light ? 'rgba(255,255,255,.6)' : 'rgba(150,190,225,.18)') : p.light ? 'rgba(255,255,190,.16)' : 'rgba(40,110,20,.10)'}
              />
            ))}
            <clipPath id={`clip-${isl.i}`}>
              <path d={sh.top} />
            </clipPath>
            <g clipPath={`url(#clip-${isl.i})`}>
            {isl.features.map((ft, k) =>
              ft.type === 'lake' ? (
                <Lake key={k} isl={isl} ft={ft} id="t" />
              ) : ft.type === 'river' ? (
                <River key={k} isl={isl} ft={ft} id="t" />
              ) : ft.type === 'vines' ? (
                <Vines key={k} isl={isl} ft={ft} />
              ) : null
            )}
            </g>
            {/* sandy road */}
            <path d={roadD} fill="none" stroke="rgba(90,60,20,.18)" strokeWidth="40" strokeLinecap="round" transform="translate(0,4)" />
            <path d={roadD} fill="none" stroke="#d2a466" strokeWidth="36" strokeLinecap="round" />
            <path d={roadD} fill="none" stroke="#f0d7a4" strokeWidth="27" strokeLinecap="round" />
          </g>
        )
      })}

    </svg>
  )
}

export default memo(Terrain)
