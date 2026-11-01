# Baiboly sy Fihirana FJM

PWA + APK Android (Capacitor) + Admin (Supabase). Rakitra vitsy, ny web rehetra eo amin'ny fototra.

| Zavatra | Anjara |
|---|---|
| `index.html`, `sw.js`, `manifest.json`, `sync.js`, `config.js`, `bible-app.js` | ny app |
| `hira-data.js`, `lohahevitra.js`, `dikisionera-data.js`, `baiboly.js` | angona (hira, lohahevitra, dikisionera, Baiboly) |
| `icons/` | kisary PWA |
| `assets/` | **kisary + splash ho an'ny APK** (`icon-only.png`, `icon-foreground.png`, `splash.png`) |
| `admin.html` | Admin (hira, lohahevitra, dikisionera, hafatra, kaody) + import faobe any Supabase |
| `schema.sql` | Supabase (azo averina alefa) |
| `build.js` | manamboatra `dist/` (ny site ihany) |
| `.github/workflows/build.yml` | site (Pages) + APK + Release |

## GitHub (mandeha ho azy isaky ny push)
- **Release:** manamboatra `Baiboly-sy-Fihirana-FJM.apk` ary mamoaka azy ao amin'ny **Releases**.
- **Site:** Settings → Pages → Source = **GitHub Actions**.
- **Tsy hita ny workflow?** Ny dossier `.github` dia miafina; amin'ny finday dia Add file → Create new file → `.github/workflows/build.yml` ary apetaho ny atiny.

## Kisary sy splash
Ovay fotsiny ny rakitra ao amin'ny `assets/` (PNG 1024×1024 ho an'ny kisary, 2732×2732 ho an'ny splash). Mivoaka ho azy ao amin'ny APK. Ny `icon-foreground.png` dia miaraka amin'ny lokon'ny fototra `#c41016` (ovay ao amin'ny `build.yml` raha miova).

## Bara ambany (navigation bar)
Manaraka ny loko fototry ny app (maizina/mazava) ny bara ambany ao amin'ny APK (`syncNavBar()` ao amin'ny `index.html`). Raha tianao mitovy amin'ny bara ambony, ovay ny `--bg` ho `col` ao amin'io function io.

## APK voasonia (mba hahafahana mavao)
Raha tsy misy sonia raikitra, ny APK debug dia manana sonia hafa isaky ny build (tsy azo havaozina eo ambonin'ny teo aloha; esory aloha). Indray mandeha:
```bash
keytool -genkeypair -v -keystore fjm.keystore -alias fjm -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 fjm.keystore
```
GitHub → Settings → Secrets and variables → Actions: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` (= `fjm`), `KEY_PASSWORD`. **Tehirizo tsara ny keystore.**

## Supabase (indray mandeha)
1. SQL Editor → alefaso ny `schema.sql`.
2. Authentication → mamorona ny kaonty Admin, avy eo:
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = 'EMAIL';`
3. Vonoy ny sign-ups ao amin'ny Authentication.
4. `…/admin.html` → Hiditra → "Import faobe" (Hira / Lohahevitra / Dikisionera).

## Fanamarihana
- Raha ovaina ny `hira-data.js`, `dikisionera-data.js` na `baiboly.js` → ovay ny `CACHE_NAME` ao amin'ny `sw.js`.
- `appId` `mg.jesosymamonjy.hiraplus`: aza ovaina raha efa misy ny app napetraka.
- Publishable key ihany no apetraka ao amin'ny `config.js` (aza apetraka ny `service_role`).

## Fanairana (notification)
- Ny app dia mamaky ny Supabase ho azy: rehefa sokafana, rehefa miverina eo aloha, ary isaky ny 15 min raha misokatra.
- Rehefa misy **hafatra vaovao** avy amin'ny Admin (Hafatra: published + active) na **hira / teny / lohahevitra** vaovao, dia miseho fanairana eo amin'ny finday.
- APK: mangataka alalana ny Android 13+ (sokafana ao amin'ny Option → "Alefa ny fanairana"). Web/PWA: tsindrio io bokotra io ihany.
- Fetra: tsy mandeha rehefa **mihidy tanteraka** ny app (mila push FCM na worker ho an'izany).

## Push FCM (tonga na dia mihidy aza ny app)
1. `google-services.json` (Firebase, package `mg.jesosymamonjy.hiraplus`) → eo amin'ny root (efa ao).
2. Supabase → Edge Functions → Create function **send-push** → apetaho ny atin'ny `send-push.ts` → **Verify JWT: OFF** → Deploy.
3. Supabase → Edge Functions → Secrets: `FCM_SERVICE_ACCOUNT` = ny JSON service account Firebase iray manontolo; `PUSH_SECRET` = teny miafina sanahy (ohatra 24 litera).
4. Supabase → Database → Webhooks → Create: table `notifications`, Events **Insert + Update**, Type "Supabase Edge Functions" → `send-push`, HTTP header `x-webhook-secret` = ny `PUSH_SECRET`.
5. Admin → Hafatra → soraty ary tehirizo **published + active** → tonga ny fanairana amin'ny finday rehetra.
