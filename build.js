// Manamboatra dist/ (ny site ihany): ho an'ny GitHub Pages sy ny APK (Capacitor webDir).
const fs = require('fs');
const FILES = ['index.html', 'sw.js', 'manifest.json', 'config.js', 'sync.js', 'bible-app.js', 'baiboly.js',
  'hira-data.js', 'lohahevitra.js', 'dikisionera-data.js', 'logo-menu.png', 'icons', 'admin.html'];
fs.rmSync('dist', { recursive: true, force: true });
for (const f of FILES) fs.cpSync(f, 'dist/' + f, { recursive: true });
console.log('dist/ vita:', FILES.length, 'zavatra');
