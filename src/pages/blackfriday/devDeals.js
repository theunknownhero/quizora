// Local-dev pool for /blackfriday when Supabase isn't configured. Only loaded in dev builds (see BlackFriday.jsx);
// production rounds come from the server so answers never reach the browser. Source of truth: supabase/011_blackfriday_fake_or_real.sql
export const deals = [
  {
    "item": "Last year's 55-inch 4K TV — $279 (was $449)",
    "type": "Store flyer",
    "emoji": "📺",
    "answer": true,
    "fact": "Around a third off an older TV model, in a big store's own flyer: a classic, believable Black Friday deal."
  },
  {
    "item": "Previous-model wireless earbuds in the brand's own app — $129 (was $199)",
    "type": "Official app",
    "emoji": "🎧",
    "answer": true,
    "fact": "A modest cut on last year's model, sold through the brand's own app, is exactly what genuine deals look like."
  },
  {
    "item": "Buy one, get one free on all board games",
    "type": "Store flyer",
    "emoji": "🎲",
    "answer": true,
    "fact": "Buy-one-get-one offers on games and toys are a long-running Black Friday favourite."
  },
  {
    "item": "Games console bundle with an extra game included — $449 (was $529)",
    "type": "Retailer website",
    "emoji": "🎮",
    "answer": true,
    "fact": "Real console deals are usually small: a bundle or a cut of 10–20%, never 90% off."
  },
  {
    "item": "Coffee machine doorbuster, first 20 customers only — $49 (was $99)",
    "type": "Store flyer",
    "emoji": "☕",
    "answer": true,
    "fact": "Doorbusters are real: a few items at a big discount to pull shoppers in early, while stocks last."
  },
  {
    "item": "Streaming subscription, first 6 months — $2.99 a month (was $7.99)",
    "type": "Email",
    "emoji": "🍿",
    "answer": true,
    "fact": "Cheap intro months are common on Black Friday. Just check what the price goes back to afterwards."
  },
  {
    "item": "Free shipping on every order, Friday to Cyber Monday",
    "type": "Email newsletter",
    "emoji": "📦",
    "answer": true,
    "fact": "Free-shipping weekends are one of the most common genuine Black Friday perks."
  },
  {
    "item": "Last season's running shoes on the brand's official site — $84 (was $140)",
    "type": "Official website",
    "emoji": "👟",
    "answer": true,
    "fact": "40% off an older colourway, straight from the official store, is a typical and believable sneaker deal."
  },
  {
    "item": "Previous-generation laptop at an electronics chain — $649 (was $899)",
    "type": "Retailer website",
    "emoji": "💻",
    "answer": true,
    "fact": "Genuine laptop deals usually land around 20–30% off, often on last year's model."
  },
  {
    "item": "Buy a $100 gift card, get a $20 bonus card free",
    "type": "In-store sign",
    "emoji": "🎁",
    "answer": true,
    "fact": "Gift card bonuses are a real Black Friday promotion. Watch out: the bonus card often expires within weeks."
  },
  {
    "item": "Robot vacuum at a big-box store, limited stock — $199 (was $399)",
    "type": "Store flyer",
    "emoji": "🤖",
    "answer": true,
    "fact": "Small home gadgets like robot vacuums often get their biggest cuts of the year on Black Friday."
  },
  {
    "item": "Brand-new iPhone 18 Pro, sealed in box — $99 (was $1,199)",
    "type": "Instagram ad",
    "emoji": "📱",
    "answer": false,
    "fact": "No new flagship phone drops 90% overnight. Prices like this are bait used by fake shops to steal card details."
  },
  {
    "item": "PlayStation 5 Pro, today only through this text link — $49 (was $699)",
    "type": "Text message",
    "emoji": "🕹️",
    "answer": false,
    "fact": "Surprise texts with crazy prices and a link are classic phishing. Go to the shop's own app or website instead."
  },
  {
    "item": "Air Jordan 1s in every size, on a site that opened last week — $19 (was $180)",
    "type": "Pop-up ad",
    "emoji": "👟",
    "answer": false,
    "fact": "Famous sneakers at 90% off on a brand-new site is the top sign of a fake shop selling counterfeits, or nothing at all."
  },
  {
    "item": "65-inch OLED TV, gift card payment only — $299 (was $1,999)",
    "type": "Email",
    "emoji": "📺",
    "answer": false,
    "fact": "No real shop asks you to pay with gift cards. Scammers love them because the money can't be traced or refunded."
  },
  {
    "item": "Free laptop for answering 3 quick survey questions — $0 (was $1,099)",
    "type": "Pop-up ad",
    "emoji": "💻",
    "answer": false,
    "fact": "'Win a laptop' surveys are bait for your personal and card details. The prize never turns up."
  },
  {
    "item": "Designer handbag, crypto or wire transfer only — $60 (was $2,800)",
    "type": "Direct message",
    "emoji": "👜",
    "answer": false,
    "fact": "Crypto or wire transfer only means no buyer protection: if the bag never arrives, the money is gone."
  },
  {
    "item": "Electric scooter giveaway, you just pay shipping — $4.99 (was $699)",
    "type": "Social media post",
    "emoji": "🛴",
    "answer": false,
    "fact": "'Free, just pay shipping' giveaways often hide a subscription that keeps charging your card every month."
  },
  {
    "item": "AirPods Pro with '7 left' and a 2-minute countdown — $12 (was $249)",
    "type": "Shopping website",
    "emoji": "🎧",
    "answer": false,
    "fact": "Fake timers and 'only a few left' badges on an impossible price are pressure tactics to stop you thinking."
  },
  {
    "item": "Pay a $1.99 'customs fee' to release your Black Friday parcel",
    "type": "Text message",
    "emoji": "📦",
    "answer": false,
    "fact": "Fake delivery-fee texts surge around Black Friday. Real couriers don't ask for small fees through random links."
  },
  {
    "item": "Nintendo Switch 2 from a seller with 0 reviews, bank transfer only — $35 (was $449)",
    "type": "Marketplace listing",
    "emoji": "🎮",
    "answer": false,
    "fact": "A brand-new console, no reviews, no buyer protection and 90% off: four red flags in one listing."
  },
  {
    "item": "Gaming laptop on techmart-0fficial.shop — $89 (was $1,299)",
    "type": "Search ad",
    "emoji": "🌐",
    "answer": false,
    "fact": "Lookalike web addresses with typos, zeros for O's or odd endings are a hallmark of fake shops. Check the URL letter by letter."
  }
]

export function pickDeals(n = 10) {
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1])
  const real = shuffle(deals.filter((d) => d.answer))
  const fake = shuffle(deals.filter((d) => !d.answer))
  const half = Math.floor(n / 2)
  return shuffle([...real.slice(0, n - half), ...fake.slice(0, half)])
}
