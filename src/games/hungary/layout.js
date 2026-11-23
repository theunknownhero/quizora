import { spriteSizes } from './spriteSizes.js'

// Map layout in "world units" (scaled to the screen). 8 big floating islands stacked tightly
// like a saga map: play starts at the bottom (Great Plain) and ends at the top (Buda).
// The balloon flies straight from island to island (no bridges).
//
// All feature/prop coords are relative to the island center: dx (right +), dy (down +).
// Props are anchored at bottom-center.

export const WORLD_W = 1000
const SPACING = 350
const BOTTOM = 3060
export const WORLD_H = BOTTOM + 120

const RX = 465
const RY = 132

// Level positions on the road. Even islands run left->right, odd islands right->left.
const EVEN = [[-230, 72], [5, 28], [235, -22]]
const ODD = [[200, 70], [-150, 18]]

const P = (n, dx, dy, s = 1, extra = {}) => ({ n, dx, dy, s, ...extra })

const defs = [
  // 0 — The Great Plain (start)
  {
    cx: 490, seed: 11, nodes: EVEN, foliage: 'default',
    features: [{ type: 'river', pts: [[470, -20], [330, 40], [130, 92], [40, 140]], w: 30 }],
    props: [
      P('csarda_farmhouse', -300, 18, 1.1),
      P('red_paprika_strings', -380, 22, 0.42, { fixed: true }),
      P('shadoof_well', -110, -24, 0.95),
      P('hungarian_grey_cattle', 120, -46, 0.72),
      P('white_stork', -250, -58, 0.42, { fixed: true }),
      P('csikos_horseman', 250, 112, 0.85),
      P('racka_sheep', -40, 118, 0.5),
      P('sheep_white', -150, 120, 0.48),
      P('sunflowers', 400, 70, 0.7),
      P('hortobagy_nine_arch_bridge', 330, 42, 0.55),
      P('paprika_drying_cottage', 300, -40, 0.75),
      P('hungarian_flag_on_pole', -430, 40, 0.55, { fixed: true }),
      P('dry_reeds', 160, 120, 0.5),
      P('waterfall_thin_a', 40, 250, 1.4, { back: true, fixed: true }),
    ],
  },
  // 1 — Tokaj
  {
    cx: 510, seed: 23, nodes: ODD, foliage: 'autumn',
    features: [
      { type: 'vines', x: -10, y: -112, w: 410, h: 72, rows: 5 },
      { type: 'vines', x: -420, y: -70, w: 190, h: 40, rows: 3 },
      { type: 'vines', x: -380, y: 72, w: 220, h: 44, rows: 3 },
      { type: 'vines', x: 260, y: 96, w: 150, h: 30, rows: 2 },
    ],
    props: [
      P('tokaj_wine_cellars', 250, 22, 1.15),
      P('tokaj_grapes', 40, -24, 0.65),
      P('wine_barrel_bottle_glass', -200, 116, 0.95),
      P('oak_wine_barrel', -80, 122, 0.55),
      P('oak_wine_barrel', 90, 118, 0.5),
      P('paloc_small_house', -320, -20, 0.85),
      P('kurtoskalacs_stall', 30, 128, 0.6),
    ],
  },
  // 2 — Lake Balaton
  {
    cx: 490, seed: 37, nodes: EVEN, foliage: 'lake',
    features: [{ type: 'lake', dx: 215, dy: 66, rx: 215, ry: 56 }],
    props: [
      P('tihany_abbey', -290, 18, 1.2),
      P('lavender_field_patch', -110, -30, 1.1),
      P('lavender_shrub', -410, 40, 0.6),
      P('heviz_wooden_bathhouse', 300, 82, 0.85),
      P('sailing_boat_large', 120, 62, 0.62),
      P('sailing_boat_small', 200, 40, 0.62),
      P('thermal_water_lilies', 70, 104, 0.5),
      P('beach_umbrella_lounger', -130, 122, 0.7),
      P('green_reeds', 420, 62, 0.55),
      P('kurtoskalacs_stall', 130, -48, 0.65),
      P('langos_food', -405, 58, 0.5),
    ],
  },
  // 3 — Mátra & Bükk (snow)
  {
    cx: 510, seed: 41, nodes: ODD, snow: true, foliage: 'snow',
    features: [],
    props: [
      P('snow_mountain_range', 40, -98, 1.4, { back: true, fixed: true }),
      P('lillafured_palace_hotel', 270, 22, 1.1),
      P('waterfall_thin_a', 400, 40, 0.65),
      P('kekesteto_tv_tower', 70, -30, 0.95),
      P('narrow_gauge_train', -200, 108, 1),
      P('buso_masked_figures', -20, 128, 0.8),
      P('holloko_village_houses', -330, -20, 0.85),
    ],
  },
  // 4 — Eger & the North
  {
    cx: 490, seed: 53, nodes: EVEN, foliage: 'default',
    features: [],
    props: [
      P('eger_castle', -280, 18, 1.1),
      P('eger_baroque_houses', -60, -24, 0.95),
      P('aggtelek_cave', 330, 66, 0.82),
      P('hungarian_folk_couple', 150, 116, 0.75),
      P('kurtoskalacs_stall', 40, 128, 0.7),
      P('paloc_small_house', 330, -36, 0.8),
      P('rock_cluster_small', -430, 40, 0.5),
    ],
  },
  // 5 — Danube Bend
  {
    cx: 510, seed: 67, nodes: ODD, foliage: 'default',
    features: [{ type: 'river', pts: [[-480, 0], [-300, 64], [-150, 110], [-60, 150]], w: 54 }],
    props: [
      P('green_mountain_range', 60, -96, 0.95, { back: true, fixed: true }),
      P('esztergom_basilica', 270, 24, 1),
      P('visegrad_citadel', 50, -28, 0.85),
      P('danube_cruise_boat', -290, 82, 0.55),
      P('sailing_boat_small', -160, 112, 0.5),
      P('holloko_village_houses', 380, 96, 0.7),
    ],
  },
  // 6 — Budapest · Pest
  {
    cx: 490, seed: 71, nodes: EVEN, foliage: 'city',
    features: [],
    props: [
      P('st_stephens_basilica', -300, 18, 1.2),
      P('great_market_hall', -90, -24, 0.78),
      P('heroes_square', 140, -50, 0.68),
      P('szechenyi_thermal_baths', 230, 104, 0.68),
      P('yellow_budapest_tram', -120, 128, 0.8),
      P('vizsla_dog', 420, 40, 0.5),
      P('park_bench', -260, 124, 0.45),
      P('ornamental_fountain', 30, 124, 0.45),
    ],
  },
  // 7 — Budapest · Buda (finish)
  {
    cx: 510, seed: 89, nodes: ODD, finale: true, foliage: 'city',
    features: [{ type: 'river', pts: [[-490, 30], [-290, 98], [-130, 138], [-40, 160]], w: 66 }],
    props: [
      P('buda_castle', -280, 2, 0.92),
      P('hungarian_parliament', 40, -36, 0.72),
      P('fishermans_bastion', 330, 14, 0.78),
      P('matthias_church', 200, -64, 0.55),
      P('chain_bridge_lions', -240, 126, 0.58),
      P('danube_cruise_boat', -380, 70, 0.42),
      P('hungarian_flag_on_pole', -440, 30, 0.55, { fixed: true }),
      P('hungarian_bunting', 420, 70, 0.6, { fixed: true }),
    ],
  },
]

// Buildings drawn larger than native so the islands feel full (like the saga-map reference).
const PROP_K = 1.38

const FOLIAGE = {
  default: ['oak_tree', 'small_round_tree', 'bright_bush', 'green_bush', 'bush_pair', 'broadleaf_bush', 'oak_tree', 'evergreen', 'red_berry_shrub', 'small_shrub', 'oak_tree'],
  city: ['oak_tree', 'small_round_tree', 'green_bush', 'bright_bush', 'oak_tree', 'red_berry_shrub', 'small_shrub', 'pink_tree'],
  snow: ['snowy_pine', 'winter_pine', 'snowy_pine', 'evergreen', 'winter_pine'],
  autumn: ['autumn_tree', 'oak_tree', 'autumn_tree', 'bright_bush', 'small_round_tree', 'autumn_tree'],
  lake: ['oak_tree', 'pink_tree', 'small_round_tree', 'green_bush', 'bush_pair', 'green_reeds', 'oak_tree'],
}
const FLOWERS = ['meadow_flowers', 'small_shrub', 'red_berry_shrub']

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const distToSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
const distToPoly = (px, py, pts) => {
  let m = Infinity
  for (let i = 0; i < pts.length - 1; i++) m = Math.min(m, distToSeg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]))
  return m
}

// Road = level points with short tails at both ends.
function roadPoints(nodes) {
  const a = nodes[0]
  const b = nodes[nodes.length - 1]
  const tail = (p, q) => {
    const dx = p[0] - q[0]
    const dy = p[1] - q[1]
    const l = Math.hypot(dx, dy) || 1
    return [p[0] + (dx / l) * 110, p[1] + (dy / l) * 40]
  }
  return [tail(a, nodes[1]), ...nodes, tail(b, nodes[nodes.length - 2])]
}

// Fill free grass with trees & bushes (rim first, then interior), avoiding road, water and buildings.
function scatter(isl, props) {
  const r = rng(isl.seed * 31 + 5)
  const set = FOLIAGE[isl.foliage]
  const road = isl.road
  const boxes = props.map((p) => {
    const [w, h] = spriteSizes[p.n] || [80, 80]
    return { x0: p.dx - (w * p.s) / 2 - 8, x1: p.dx + (w * p.s) / 2 + 8, y0: p.dy - h * p.s * 0.5, y1: p.dy + 14 }
  })
  const out = []
  const blocked = (dx, dy, minGap) => {
    if (distToPoly(dx, dy, road) < 46) return true
    if (boxes.some((b) => dx > b.x0 && dx < b.x1 && dy > b.y0 && dy < b.y1)) return true
    if (out.some((o) => Math.hypot(o.dx - dx, (o.dy - dy) * 1.7) < minGap)) return true
    for (const ft of isl.features) {
      if (ft.type === 'lake' && ((dx - ft.dx) / (ft.rx + 22)) ** 2 + ((dy - ft.dy) / (ft.ry + 18)) ** 2 < 1) return true
      if (ft.type === 'river' && distToPoly(dx, dy, ft.pts) < ft.w / 2 + 20) return true
      if (ft.type === 'vines' && dx > ft.x - 8 && dx < ft.x + ft.w + 8 && dy > ft.y - 12 && dy < ft.y + ft.h + 12) return true
    }
    return false
  }
  const add = (dx, dy, small) => {
    const n = small ? FLOWERS[Math.floor(r() * FLOWERS.length)] : set[Math.floor(r() * set.length)]
    const tree = /tree|pine|evergreen/.test(n)
    out.push({ n, dx, dy, s: tree ? 0.62 + r() * 0.25 : 0.5 + r() * 0.2, flip: r() > 0.5, foliage: true })
  }
  // 1) rim: a ring of trees round the back & sides, bushes round the front
  for (let t = 0; t < Math.PI * 2; t += 0.075) {
    const front = Math.sin(t) > 0.35
    const rad = front ? 0.9 : 0.93 + r() * 0.04
    const dx = Math.cos(t) * RX * rad + (r() - 0.5) * 10
    const dy = Math.sin(t) * RY * rad + 4
    if (!blocked(dx, dy, front ? 40 : 36)) add(dx, dy, front && r() > 0.5)
  }
  // 2) interior fill
  for (let k = 0; k < 600 && out.length < 90; k++) {
    const a = r() * Math.PI * 2
    const rad = Math.sqrt(r()) * 0.88
    const dx = Math.cos(a) * RX * rad
    const dy = Math.sin(a) * RY * rad + 4
    if (!blocked(dx, dy, 38)) add(dx, dy, r() > 0.72)
  }
  return out
}

export const islands = defs.map((d, i) => {
  const B = BOTTOM - i * SPACING
  const isl = { ...d, i, region: i, cy: B - 200, rx: RX, ry: RY, depth: 62 }
  isl.road = roadPoints(d.nodes)
  isl.nodePts = d.nodes.map(([dx, dy]) => ({ x: isl.cx + dx, y: isl.cy + dy }))
  const props = d.props.map((p) => (p.fixed ? p : { ...p, s: p.s * PROP_K }))
  isl.props = [...props, ...scatter(isl, props)]
  return isl
})

// Level nodes in play order (bottom -> top)
export const nodes = islands.flatMap((isl) => isl.nodePts.map((p) => ({ ...p, region: isl.region, island: isl.i })))

export const sky = {
  clouds: [
    { x: 40, y: 3020, s: 1.6, d: 70 }, { x: 960, y: 2840, s: 1.3, d: 85 }, { x: 60, y: 2470, s: 1.2, d: 75 },
    { x: 960, y: 2130, s: 1.5, d: 65 }, { x: 30, y: 1780, s: 1.3, d: 90 }, { x: 970, y: 1430, s: 1.2, d: 70 },
    { x: 40, y: 1090, s: 1.4, d: 80 }, { x: 960, y: 740, s: 1.3, d: 75 }, { x: 50, y: 400, s: 1.5, d: 85 },
    { x: 900, y: 110, s: 1.6, d: 70 }, { x: 300, y: 50, s: 1.2, d: 95 },
  ],
  balloons: [{ x: 960, y: 1660, s: 0.75 }, { x: 40, y: 960, s: 0.6 }],
  storks: [{ x: 880, y: 1300 }, { x: 860, y: 2000 }, { x: 140, y: 560 }],
}
