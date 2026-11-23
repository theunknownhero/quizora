// Region-specific home content. Each country gets its own topic strip; "ALL" is the global default.
// Add a country by adding a key with its code.

export const regionalTopics = {
  ALL: ['Pyramids of Giza', 'The Beatles', 'Mount Everest', 'Pizza', 'Olympic Games', 'Eiffel Tower', 'Mona Lisa', 'Moon landing', 'Sushi', 'Great Wall'],
  HU: ['Gulyás', 'Rubik-kocka', 'Balaton', 'Lángos', 'Puskás Ferenc', 'Tokaji', 'Parlament', 'Busójárás', 'Liszt Ferenc', 'Hortobágy'],
  DE: ['Brandenburger Tor', 'Oktoberfest', 'Brezel', 'Beethoven', 'Autobahn', 'Neuschwanstein', 'Bundesliga', 'Currywurst', 'Einstein', 'Rhein'],
  US: ['Statue of Liberty', 'Grand Canyon', 'Super Bowl', 'Hollywood', 'Route 66', 'Apple pie', 'NASA', 'Broadway', 'Jazz', 'Yellowstone'],
  CA: ['Niagara Falls', 'Maple syrup', 'Hockey', 'CN Tower', 'Poutine', 'Rocky Mountains', 'Banff', 'Mounties', 'Toronto', 'Northern lights'],
  CZ: ['Karlův most', 'Pilsner', 'Pražský hrad', 'Krtek', 'Svíčková', 'Dvořák', 'Kafka', 'Orloj', 'Škoda', 'Hokej'],
  RS: ['Kalemegdan', 'Ćevapi', 'Nikola Tesla', 'Novak Đoković', 'Exit festival', 'Ajvar', 'Drina', 'Studenica', 'Guča', 'Beograd'],
  ES: ['Sagrada Família', 'Paella', 'Flamenco', 'La Liga', 'Alhambra', 'Tapas', 'Picasso', 'Camino de Santiago', 'Don Quijote', 'La Tomatina'],
  PT: ['Pastel de nata', 'Fado', 'Torre de Belém', 'Cristiano Ronaldo', 'Port wine', 'Azulejos', 'Sintra', 'Elétrico 28', 'Bacalhau', 'Algarve'],
}

export const topicsFor = (code) => regionalTopics[code] || regionalTopics.ALL

// Language used for each country (fallback: English)
export const countryLang = { HU: 'hu', DE: 'de', CZ: 'cs', RS: 'sr', ES: 'es', PT: 'pt', US: 'en', CA: 'en', ALL: 'en' }

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'hu', name: 'Magyar' },
  { code: 'de', name: 'Deutsch' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sr', name: 'Srpski' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
]
