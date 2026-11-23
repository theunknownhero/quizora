// Illustrated map: one painted image with the level discs placed on its path.
// Coordinates are in the image's own pixels (bottom = start, top = finish).
// To use a higher-resolution version of the same artwork, replace the file and set w/h;
// disc positions scale automatically if the new image keeps the same proportions (multiply by newW/667).

export const MAP_IMAGE = {
  src: '/games/hungary/map/hungary-map.webp',
  w: 667,
  h: 2000,
}

// [x, y, regionIndex] — region indexes match `regions` in questions.js
const pts = [
  // Great Plain
  [365, 1848, 0], [290, 1778, 0], [232, 1706, 0],
  // Tokaj
  [225, 1560, 1], [360, 1480, 1],
  // Lake Balaton
  [300, 1407, 2], [203, 1350, 2], [282, 1284, 2],
  // Mátra & Bükk
  [215, 1170, 3], [290, 1078, 3],
  // Eger & the North
  [225, 1004, 4], [320, 938, 4], [418, 878, 4],
  // Danube Bend
  [232, 777, 5], [153, 702, 5],
  // Budapest · Pest
  [300, 592, 6], [370, 535, 6], [262, 455, 6],
  // Budapest · Buda
  [190, 302, 7], [395, 102, 7],
]

export const imageNodes = pts.map(([x, y, region]) => ({ x, y, region }))
