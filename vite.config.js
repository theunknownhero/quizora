import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Link previews (Open Graph / Twitter cards) are read from the HTML before any script runs, so pages that need
// their own preview get their own copy of index.html at build time. vercel.json routes the path to that file.
const SHARE_PAGES = {
  'blackfriday.html': {
    title: 'Black Friday Madness: Fake or Real? | QuizBit',
    description: 'Real Black Friday offer, or not? Spot the scams, score 7 out of 10 and win a real prize.',
    url: 'https://quizbit.net/blackfriday',
    image: 'https://quizbit.net/og/blackfriday-share.jpg',
    imageAlt: 'Black Friday Madness: real Black Friday offer, or not?',
    noindex: true, // link-only campaign page
  },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function sharePages() {
  return {
    name: 'quizbit-share-pages',
    apply: 'build',
    writeBundle(options, bundle) {
      const html = String(bundle['index.html']?.source || '')
      if (!html.includes('<!-- share:start')) throw new Error('index.html is missing the share:start/share:end block')
      for (const [file, p] of Object.entries(SHARE_PAGES)) {
        const tags = [
          p.noindex && '<meta name="robots" content="noindex, nofollow" />',
          '<meta property="og:type" content="website" />',
          '<meta property="og:site_name" content="QuizBit" />',
          `<meta property="og:url" content="${esc(p.url)}" />`,
          `<meta property="og:title" content="${esc(p.title)}" />`,
          `<meta property="og:description" content="${esc(p.description)}" />`,
          `<meta property="og:image" content="${esc(p.image)}" />`,
          '<meta property="og:image:width" content="1200" />',
          '<meta property="og:image:height" content="630" />',
          `<meta property="og:image:alt" content="${esc(p.imageAlt)}" />`,
          '<meta name="twitter:card" content="summary_large_image" />',
          `<meta name="twitter:title" content="${esc(p.title)}" />`,
          `<meta name="twitter:description" content="${esc(p.description)}" />`,
          `<meta name="twitter:image" content="${esc(p.image)}" />`,
        ]
          .filter(Boolean)
          .join('\n    ')
        const out = html
          .replace(/<!-- share:start[\s\S]*?<!-- share:end -->/, tags)
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
          .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(p.description)}" />`)
        fs.writeFileSync(path.join(options.dir, file), out)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), sharePages()],
  // Expose VITE_* and NEXT_PUBLIC_* env vars to the browser. NEXT_PUBLIC_* lets Vercel's Supabase
  // integration work with zero setup (it adds NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY automatically).
  // Never add a prefix like SUPABASE_ here: that would leak SUPABASE_SERVICE_ROLE_KEY to the browser.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
