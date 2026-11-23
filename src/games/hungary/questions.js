// Hungary or Not? — question pool. Each game draws ROUND_SIZE random questions.
// answer: true = Hungarian origin, false = not Hungarian.
// sprite: optional asset from /public/games/hungary/sprites (shown instead of the emoji).

export const ROUND_SIZE = 20
export const WIN_SCORE = 14 // correct answers needed to win
export const PRIZE_URL = 'https://fortunejack.com' // where "Claim the Prize" goes

const H = true
const N = false

export const pool = [
  // ---------------- Hungarian (50) ----------------
  { item: "Rubik's Cube", type: 'Invention', emoji: '🧊', answer: H, fact: 'Invented in 1974 by Ernő Rubik, a Budapest architecture professor. It is one of the best-selling toys ever.' },
  { item: 'Ballpoint pen', type: 'Invention', emoji: '🖊️', answer: H, fact: 'Hungarian journalist László Bíró patented it in 1938. In many countries a ballpoint is still called a "biro".' },
  { item: 'Goulash', type: 'Food', emoji: '🍲', answer: H, fact: 'Gulyás means "herdsman". Cattle herders on the Great Plain cooked it in kettles over open fires.' },
  { item: 'Harry Houdini', type: 'Celebrity', emoji: '🎩', answer: H, fact: 'The escape artist was born Erik Weisz in Budapest in 1874, before his family moved to the USA.' },
  { item: 'Lángos', type: 'Food', sprite: 'langos_food', answer: H, fact: 'Deep-fried dough with sour cream, cheese and garlic. It is the classic Lake Balaton beach snack.' },
  { item: 'Chimney cake', type: 'Food', sprite: 'kurtoskalacs_chimney_cake', answer: H, fact: 'Kürtőskalács comes from the Hungarian-speaking Székely Land. Dough is wrapped round a spit and baked over embers.' },
  { item: 'Busójárás', type: 'Tradition', sprite: 'buso_masked_figures', answer: H, fact: 'Each February in Mohács, people in scary wooden masks chase winter away. It is on UNESCO’s heritage list.' },
  { item: 'Vizsla', type: 'Dog breed', sprite: 'vizsla_dog', answer: H, fact: 'This golden-rust pointer is a Hungarian hunting dog with roots going back over a thousand years.' },
  { item: 'Tokaji Aszú', type: 'Drink', sprite: 'tokaj_grapes', answer: H, fact: 'Sweet wine from Tokaj, one of the first wine regions in the world to be officially classified (1737).' },
  { item: 'Isolating Vitamin C', type: 'Science', sprite: 'red_paprika_strings', answer: H, fact: 'Albert Szent-Györgyi isolated vitamin C, using Szeged paprika as a source, and won the 1937 Nobel Prize.' },
  { item: 'Holography', type: 'Invention', emoji: '🌈', answer: H, fact: 'Budapest-born physicist Dennis Gabor invented holography in 1947 and won the 1971 Nobel Prize for it.' },
  { item: 'Bela Lugosi', type: 'Celebrity', emoji: '🧛', answer: H, fact: 'The actor who played Dracula in 1931 was born in Lugos, in the Kingdom of Hungary, in 1882.' },
  { item: 'Noiseless match', type: 'Invention', emoji: '🔥', answer: H, fact: 'Chemistry student János Irinyi invented the quiet, non-exploding phosphorus match in 1836.' },
  { item: 'Telephone exchange', type: 'Invention', emoji: '☎️', answer: H, fact: 'Tivadar Puskás came up with the telephone exchange while working with Edison, and built Budapest’s in 1881.' },
  { item: 'Dobos torte', type: 'Food', emoji: '🍰', answer: H, fact: 'Budapest confectioner József C. Dobos created this layered cake with a caramel top in 1885.' },
  { item: 'Gömböc', type: 'Invention', emoji: '🥚', answer: H, fact: 'A shape that always rolls back upright on its own, discovered by Hungarian scientists Domokos and Várkonyi in 2006.' },
  { item: 'Puli', type: 'Dog breed', emoji: '🐕', answer: H, fact: 'The mop-like herding dog with corded coat has guarded Hungarian flocks for centuries.' },
  { item: 'Komondor', type: 'Dog breed', emoji: '🐩', answer: H, fact: 'A huge white livestock guardian dog with dreadlocks. It is a Hungarian national treasure.' },
  { item: 'Pálinka', type: 'Drink', emoji: '🍑', answer: H, fact: 'Fruit brandy whose name is protected by the EU. It must be made from fruit grown and distilled in Hungary.' },
  { item: 'Unicum', type: 'Drink', emoji: '🍾', answer: H, fact: 'A bitter herbal liqueur created by Dr. József Zwack in 1790, still made in Budapest.' },
  { item: 'Franz Liszt', type: 'Celebrity', emoji: '🎹', answer: H, fact: 'The piano superstar was born in 1811 in the Kingdom of Hungary and founded Budapest’s Academy of Music.' },
  { item: 'Béla Bartók', type: 'Celebrity', emoji: '🎻', answer: H, fact: 'One of the greatest composers of the 1900s. He collected thousands of Hungarian folk songs.' },
  { item: 'Joseph Pulitzer', type: 'Celebrity', emoji: '📰', answer: H, fact: 'The publisher behind the Pulitzer Prize was born in Makó, Hungary, in 1847.' },
  { item: 'Zsa Zsa Gabor', type: 'Celebrity', emoji: '💎', answer: H, fact: 'The Hollywood star and socialite was born in Budapest in 1917.' },
  { item: 'Matyó embroidery', type: 'Tradition', emoji: '🌺', answer: H, fact: 'Colourful rose patterns from Mezőkövesd, added to UNESCO’s intangible heritage list in 2012.' },
  { item: 'Hungarian Grey cattle', type: 'Animal breed', sprite: 'hungarian_grey_cattle', answer: H, fact: 'Ancient long-horned cattle that roamed the Great Plain and were once driven to markets across Europe.' },
  { item: 'Chicken paprikash', type: 'Food', emoji: '🍗', answer: H, fact: 'Csirkepaprikás: chicken in a creamy paprika sauce, usually served with little dumplings (nokedli).' },
  { item: 'Túró Rudi', type: 'Food', emoji: '🍫', answer: H, fact: 'A chocolate-coated sweet curd bar launched in Hungary in 1968. Fans call it the national snack.' },
  { item: 'Somlói galuska', type: 'Food', emoji: '🍨', answer: H, fact: 'Sponge cake with chocolate sauce, walnuts and whipped cream, a Hungarian classic since the 1950s.' },
  { item: 'Carburetor (1893)', type: 'Invention', emoji: '⚙️', answer: H, fact: 'Hungarian engineers Donát Bánki and János Csonka patented their carburetor in 1893.' },
  { item: 'Electric dynamo', type: 'Invention', emoji: '🔋', answer: H, fact: 'Benedictine monk Ányos Jedlik described the self-excited dynamo years before Werner Siemens.' },
  { item: 'AC transformer', type: 'Invention', emoji: '⚡', answer: H, fact: 'Zipernowsky, Bláthy and Déri at Budapest’s Ganz works built the modern transformer in 1885.' },
  { item: 'John von Neumann', type: 'Celebrity', emoji: '🧠', answer: H, fact: 'The Budapest-born genius designed the computer architecture almost every computer still uses.' },
  { item: 'Csárdás', type: 'Tradition', sprite: 'hungarian_folk_couple', answer: H, fact: 'A Hungarian folk dance that starts slow and ends fast. Its name comes from the csárda (village inn).' },
  { item: 'Winter salami', type: 'Food', emoji: '🥓', answer: H, fact: 'Szeged’s Pick winter salami, made since 1869, is air-dried and covered in a noble white mould.' },
  { item: 'Herend porcelain', type: 'Tradition', emoji: '🫖', answer: H, fact: 'Hand-painted porcelain made in the village of Herend since 1826. Queen Victoria was a customer.' },
  { item: 'Ignaz Semmelweis', type: 'Celebrity', emoji: '🧼', answer: H, fact: 'The Buda-born doctor showed that hand-washing saves lives. He is called the "saviour of mothers".' },
  { item: 'Ferenc Puskás', type: 'Celebrity', emoji: '⚽', answer: H, fact: 'Hungary’s football legend. FIFA’s award for the goal of the year is named after him.' },
  { item: 'Robert Capa', type: 'Celebrity', emoji: '📷', answer: H, fact: 'The famous war photographer was born Endre Friedmann in Budapest in 1913.' },
  { item: 'Michael Curtiz', type: 'Celebrity', emoji: '🎬', answer: H, fact: 'The director of Casablanca was born in Budapest in 1886.' },
  { item: 'Edward Teller', type: 'Celebrity', emoji: '⚛️', answer: H, fact: 'The Budapest-born physicist was one of the "Martians", a group of brilliant Hungarian scientists.' },
  { item: 'Fisherman’s soup', type: 'Food', emoji: '🐟', answer: H, fact: 'Halászlé: a fiery paprika fish soup, traditionally cooked by the Danube and the Tisza on Christmas Eve.' },
  { item: 'Lecsó', type: 'Food', emoji: '🫑', answer: H, fact: 'A Hungarian stew of peppers, tomatoes and onions with paprika, often with sausage or eggs.' },
  { item: 'Mangalica pig', type: 'Animal breed', emoji: '🐖', answer: H, fact: 'The curly-haired "sheep pig" was bred in Hungary in 1833 and is prized for its rich meat.' },
  { item: 'Easter sprinkling', type: 'Tradition', emoji: '💦', answer: H, fact: 'On Easter Monday boys "sprinkle" girls with perfume (or a bucket of water!) and get painted eggs in return.' },
  { item: 'Bull’s Blood wine', type: 'Drink', sprite: 'wine_barrel_bottle_glass', answer: H, fact: 'Egri Bikavér from Eger. Legend says the castle defenders of 1552 drank red wine and the Turks thought it was bull’s blood.' },
  { item: 'Kodály method', type: 'Tradition', emoji: '🎶', answer: H, fact: 'A way of teaching music through singing, developed by composer Zoltán Kodály and used worldwide.' },
  { item: 'Hussars', type: 'Tradition', sprite: 'csikos_horseman', answer: H, fact: 'Light cavalry that spread from Hungary in the 1400s. Armies across Europe copied their style.' },
  { item: 'The coach (carriage)', type: 'Invention', emoji: '🐴', answer: H, fact: 'The word "coach" comes from Kocs, a Hungarian village where light, fast carriages were built in the 1400s.' },
  { item: 'Zsolnay ceramics', type: 'Tradition', emoji: '🏺', answer: H, fact: 'Famous glazed ceramics from Pécs since 1853. Their colourful roof tiles cover many Budapest buildings.' },

  // ---------------- Not Hungarian (50) ----------------
  { item: 'Croissant', type: 'Food', emoji: '🥐', answer: N, fact: 'Its ancestor is the Austrian kipferl. The flaky croissant was perfected in France in the 1800s.' },
  { item: 'Matryoshka doll', type: 'Tradition', emoji: '🪆', answer: N, fact: 'The nesting doll was first made in Russia in 1890, inspired by Japanese wooden figures.' },
  { item: 'Tango', type: 'Tradition', emoji: '💃', answer: N, fact: 'Born in the late 1800s along the Río de la Plata, in Argentina and Uruguay.' },
  { item: 'Nikola Tesla', type: 'Celebrity', emoji: '⚡', answer: N, fact: 'A Serb born in today’s Croatia. Fun twist: he worked at the Budapest telephone exchange in 1881!' },
  { item: 'Sauna', type: 'Tradition', emoji: '🧖', answer: N, fact: 'The sauna is Finnish. Finnish and Hungarian are distant language relatives, though.' },
  { item: 'Pizza', type: 'Food', emoji: '🍕', answer: N, fact: 'Modern pizza comes from Naples, Italy. The Margherita dates back to the late 1800s.' },
  { item: 'Wolfgang Amadeus Mozart', type: 'Celebrity', emoji: '🎼', answer: N, fact: 'Mozart was born in Salzburg in 1756, so he was Austrian.' },
  { item: 'Christmas tree', type: 'Tradition', emoji: '🎄', answer: N, fact: 'Decorating an evergreen started in Germany around the 1500s. Hungarians hang szaloncukor sweets on theirs.' },
  { item: 'Wiener schnitzel', type: 'Food', emoji: '🍖', answer: N, fact: 'The breaded veal cutlet is Vienna’s signature dish. Austria even protects the name.' },
  { item: 'Sachertorte', type: 'Food', emoji: '🎂', answer: N, fact: 'Chocolate cake with apricot jam, created by Franz Sacher in Vienna in 1832.' },
  { item: 'Pierogi', type: 'Food', emoji: '🥟', answer: N, fact: 'Filled dumplings that are a national dish of Poland.' },
  { item: 'Borscht', type: 'Food', emoji: '🥣', answer: N, fact: 'The beetroot soup is from Ukraine. Ukrainian borscht culture is on UNESCO’s list.' },
  { item: 'Polka', type: 'Tradition', emoji: '🪗', answer: N, fact: 'This lively dance started in Bohemia (today’s Czech Republic) in the 1830s.' },
  { item: 'Waltz', type: 'Tradition', emoji: '🕺', answer: N, fact: 'The waltz grew out of Austrian and Bavarian folk dances and conquered Vienna’s ballrooms.' },
  { item: 'Vlad the Impaler', type: 'Celebrity', emoji: '🦇', answer: N, fact: 'The real "Dracula" ruled Wallachia (Romania). He was held prisoner in Hungary by King Matthias, though.' },
  { item: 'Pilsner beer', type: 'Drink', emoji: '🍺', answer: N, fact: 'First brewed in Plzeň, in today’s Czech Republic, in 1842.' },
  { item: 'Kefir', type: 'Drink', emoji: '🥛', answer: N, fact: 'This fermented milk drink comes from the Caucasus mountains.' },
  { item: 'Feta cheese', type: 'Food', emoji: '🧀', answer: N, fact: 'A brined sheep’s-milk cheese protected as a Greek product.' },
  { item: 'Baklava', type: 'Food', emoji: '🍯', answer: N, fact: 'Layered pastry with nuts and syrup, perfected in the kitchens of the Ottoman palace.' },
  { item: 'Turkish coffee', type: 'Drink', emoji: '☕', answer: N, fact: 'Brewed in a cezve and served unfiltered. Its culture is on UNESCO’s list as Turkish heritage.' },
  { item: 'Frédéric Chopin', type: 'Celebrity', emoji: '🎹', answer: N, fact: 'The romantic composer was born near Warsaw, Poland, in 1810.' },
  { item: 'Marie Curie', type: 'Celebrity', emoji: '🔬', answer: N, fact: 'The double Nobel winner was born in Warsaw, Poland, and worked in France.' },
  { item: 'Sigmund Freud', type: 'Celebrity', emoji: '🛋️', answer: N, fact: 'Born in Moravia (now Czech Republic) and lived in Vienna, so he was Austrian.' },
  { item: 'Gregor Mendel', type: 'Celebrity', emoji: '🫛', answer: N, fact: 'The father of genetics was born in Silesia and worked in Brno, today’s Czech Republic.' },
  { item: 'Sugar cubes', type: 'Invention', emoji: '🧂', answer: N, fact: 'Invented by Jakub Kryštof Rad in Dačice, Moravia (today’s Czech Republic) in 1843.' },
  { item: 'The paprika plant', type: 'Food', emoji: '🌶️', answer: N, fact: 'Trick question! Peppers come from the Americas. Hungary made paprika powder famous, but the plant isn’t native.' },
  { item: 'LEGO', type: 'Invention', emoji: '🧱', answer: N, fact: 'LEGO was founded in Denmark. The name comes from "leg godt", meaning "play well".' },
  { item: 'Dynamite', type: 'Invention', emoji: '🧨', answer: N, fact: 'Swedish chemist Alfred Nobel invented dynamite in 1867.' },
  { item: 'The telephone', type: 'Invention', emoji: '📞', answer: N, fact: 'Alexander Graham Bell patented it in the USA in 1876. A Hungarian did invent the telephone exchange, though!' },
  { item: 'Light bulb', type: 'Invention', emoji: '💡', answer: N, fact: 'Developed by Thomas Edison in the USA and Joseph Swan in England.' },
  { item: 'Bagel', type: 'Food', emoji: '🥯', answer: N, fact: 'The bagel is first recorded in Kraków, Poland, in 1610.' },
  { item: 'Pretzel', type: 'Food', emoji: '🥨', answer: N, fact: 'Knotted pretzels go back to European monasteries and became a German bakery icon.' },
  { item: 'Frankfurter sausage', type: 'Food', emoji: '🌭', answer: N, fact: 'Named after Frankfurt, Germany. Vienna claims a version too.' },
  { item: 'Tiramisu', type: 'Food', emoji: '🍮', answer: N, fact: 'The coffee-soaked dessert comes from the Veneto region of Italy.' },
  { item: 'Kebab', type: 'Food', emoji: '🥙', answer: N, fact: 'Grilled meat traditions from Turkey and the Middle East.' },
  { item: 'Crêpes', type: 'Food', emoji: '🥞', answer: N, fact: 'Crêpes are French, from Brittany. Hungary’s version, palacsinta, came via Austria.' },
  { item: 'Flamenco', type: 'Tradition', emoji: '🪭', answer: N, fact: 'The passionate dance and music style comes from Andalusia, Spain.' },
  { item: 'Kilt', type: 'Tradition', emoji: '🏴', answer: N, fact: 'The tartan kilt is the traditional dress of the Scottish Highlands.' },
  { item: 'Oktoberfest', type: 'Tradition', emoji: '🍻', answer: N, fact: 'Munich’s beer festival began with a royal wedding in 1810.' },
  { item: 'Day of the Dead', type: 'Tradition', emoji: '💀', answer: N, fact: 'Día de los Muertos is a Mexican celebration honouring the dead.' },
  { item: 'Ice hockey', type: 'Tradition', emoji: '🏒', answer: N, fact: 'The modern game was organised in Montreal, Canada, in 1875.' },
  { item: 'Chess', type: 'Tradition', emoji: '♟️', answer: N, fact: 'Chess started in India as chaturanga. But Hungary’s Polgár sisters are chess legends!' },
  { item: 'Paper', type: 'Invention', emoji: '📜', answer: N, fact: 'Paper was invented in China around 2,000 years ago.' },
  { item: 'Compass', type: 'Invention', emoji: '🧭', answer: N, fact: 'The magnetic compass was invented in China.' },
  { item: 'Albert Einstein', type: 'Celebrity', emoji: '🧑‍🔬', answer: N, fact: 'Einstein was born in Ulm, Germany. His friend Leo Szilárd was Hungarian, though.' },
  { item: 'Arnold Schwarzenegger', type: 'Celebrity', emoji: '💪', answer: N, fact: 'The Terminator star was born near Graz, Austria.' },
  { item: 'Gustav Klimt', type: 'Celebrity', emoji: '🖼️', answer: N, fact: 'The painter of The Kiss was a Viennese artist.' },
  { item: 'Franz Kafka', type: 'Celebrity', emoji: '🪲', answer: N, fact: 'The writer was born in Prague, in today’s Czech Republic.' },
  { item: 'Ludwig van Beethoven', type: 'Celebrity', emoji: '🎵', answer: N, fact: 'Beethoven was born in Bonn, Germany, in 1770.' },
  { item: 'Johann Strauss II', type: 'Celebrity', emoji: '🎻', answer: N, fact: 'The "Waltz King" was born in Vienna. The Blue Danube does flow through Budapest!' },
]

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 20 random questions with a fair mix (9–11 Hungarian).
export function pickRound(size = ROUND_SIZE) {
  const hu = shuffle(pool.filter((q) => q.answer))
  const not = shuffle(pool.filter((q) => !q.answer))
  const k = Math.round(size / 2) + Math.floor(Math.random() * 3) - 1
  return shuffle([...hu.slice(0, k), ...not.slice(0, size - k)])
}

// 8 islands, bottom (start) to top (finish)
export const regions = [
  { id: 'puszta', name: 'The Great Plain', subtitle: 'Horses, herdsmen & paprika', emoji: '🐎' },
  { id: 'tokaj', name: 'Tokaj', subtitle: 'The wine of kings', emoji: '🍇' },
  { id: 'balaton', name: 'Lake Balaton', subtitle: 'The Hungarian Sea', emoji: '⛵' },
  { id: 'matra', name: 'Mátra & Bükk', subtitle: 'Snowy peaks & forest trains', emoji: '🏔️' },
  { id: 'eger', name: 'Eger & the North', subtitle: 'Castles, caves & folk art', emoji: '🏰' },
  { id: 'danube', name: 'Danube Bend', subtitle: 'Esztergom & Visegrád', emoji: '🌊' },
  { id: 'pest', name: 'Budapest · Pest', subtitle: 'Baths, trams & markets', emoji: '🚋' },
  { id: 'buda', name: 'Budapest · Buda', subtitle: 'Castles above the Danube', emoji: '👑' },
]

export const ranks = [
  { min: 0, title: 'Lost Tourist', emoji: '🧳' },
  { min: 6, title: 'Curious Explorer', emoji: '🧭' },
  { min: 12, title: 'Budapest Local', emoji: '🏙️' },
  { min: 17, title: 'True Magyar', emoji: '🇭🇺' },
  { min: 20, title: 'Honorary Hungarian', emoji: '👑' },
]
