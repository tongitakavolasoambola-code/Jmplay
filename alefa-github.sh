#!/data/data/com.termux/files/usr/bin/bash
# Alefa ny projet amin'ny GitHub avy ao Termux.
# Fampiasana:  bash alefa-github.sh
set -e
command -v git >/dev/null || pkg install -y git
if [ ! -d .git ]; then
  git init -b main
  read -p "Adiresy GitHub (ohatra https://github.com/anaranao/repo.git): " URL
  git remote add origin "$URL"
fi
git config user.name  >/dev/null || git config user.name  "FJM"
git config user.email >/dev/null || git config user.email "fjm@example.com"
git add -A
git commit -m "${1:-Baiboly sy Fihirana FJM: V18 (DIEM + Apokrifa, accueil, diksionera)}" || echo "(tsy nisy fanovana vaovao)"
echo "Rehefa angatahana: Username = anaranao GitHub, Password = TOKEN (tsy ny teny miafina)."
git push -u origin main
echo "VITA ✓ — jereo ny tab Actions ao amin'ny GitHub."
