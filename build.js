// Manamboatra dist/ (ny site ihany): ho an'ny GitHub Pages sy ny APK (Capacitor webDir).
const fs = require('fs');
const FILES = ['index.html', 'sw.js', 'manifest.json', 'config.js', 'sync.js', 'bible-app.js', 'baiboly.js', 'baiboly-diem.js',
  'hira-data.js', 'lohahevitra.js', 'dikisionera-data.js', 'logo-menu.png', 'icons', 'admin.html'];
fs.rmSync('dist', { recursive: true, force: true });
for (const f of FILES) fs.cpSync(f, 'dist/' + f, { recursive: true });
// supabase-js eo an-toerana (tsy miankina amin'ny CDN): alaina ao amin'ny node_modules (npm install)
const SB = 'node_modules/@supabase/supabase-js/dist/umd/supabase.js';
if (fs.existsSync(SB)) fs.copyFileSync(SB, 'dist/supabase.js');
else console.warn('! supabase.js tsy hita (npm install aloha) → hampiasa CDN ny app');
// Cache an'ny service worker: fjm-cache-v1 + laharan'ny build (GitHub Actions) → mihavao ho azy ny finday isaky ny deploy
const run = process.env.GITHUB_RUN_NUMBER;
if (run) {
  const s = fs.readFileSync('dist/sw.js', 'utf8').replace(/const CACHE_NAME = '([^']*)'/, (m, n) => `const CACHE_NAME = '${n}-b${run}'`);
  fs.writeFileSync('dist/sw.js', s);
}
console.log('dist/ vita:', FILES.length, 'zavatra');
