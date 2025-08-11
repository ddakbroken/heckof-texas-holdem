/*
  Download SVG playing card assets into public/cards at install/build time.
  Source repo: https://github.com/htdebeer/SVG-cards (CC0)
*/

const fs = require('fs');
const path = require('path');
const https = require('https');

const DEST_DIR = path.join(process.cwd(), 'public', 'cards');
const BASES = [
  'https://raw.githubusercontent.com/htdebeer/SVG-cards/main/svg',
  'https://raw.githubusercontent.com/htdebeer/SVG-cards/master/svg'
];

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks = ['ace','2','3','4','5','6','7','8','9','10','jack','queen','king'];
const extra = ['back'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', err => {
        file.close();
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function main() {
  ensureDir(DEST_DIR);
  const tasks = [];
  for (const s of suits) {
    for (const r of ranks) {
      const name = `${r}_of_${s}.svg`;
      const dest = path.join(DEST_DIR, name);
      if (!fs.existsSync(dest)) {
        tasks.push((async () => {
          for (const base of BASES) {
            try {
              await download(`${base}/${name}`, dest);
              return;
            } catch (_) {}
          }
        })());
      }
    }
  }
  for (const e of extra) {
    const dest = path.join(DEST_DIR, `${e}.svg`);
    if (!fs.existsSync(dest)) {
      tasks.push((async () => {
        for (const base of BASES) {
          try {
            await download(`${base}/${e}.svg`, dest);
            return;
          } catch (_) {}
        }
      })());
    }
  }
  await Promise.all(tasks);
  // Fallback: if back.svg missing, generate a minimal placeholder
  const backPath = path.join(DEST_DIR, 'back.svg');
  if (!fs.existsSync(backPath)) {
    fs.writeFileSync(
      backPath,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 350"><rect x="5" y="5" rx="18" ry="18" width="240" height="340" fill="#7f1d1d" stroke="#d1d5db" stroke-width="6"/><text x="125" y="175" fill="#fbbf24" font-family="Georgia, serif" font-size="28" text-anchor="middle">heckof.ai</text></svg>`
    );
  }
}

main().catch(err => {
  // Do not fail install/build if asset fetch fails; continue gracefully
  console.warn('[cards] Warning:', err.message);
});
