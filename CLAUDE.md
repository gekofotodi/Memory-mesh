# CLAUDE.md — Memory Mesh

Contesto sintetico per Claude Code. **Leggi questo file invece di scansionare tutta la repo.** Apri solo i file (e le sezioni) che servono al task.

Archivio di memoria comunitaria + installazione interattiva per il **Centro Giovanile Stoà**.
Due front-end statici che condividono un backend Supabase:
- `/upload` → web app mobile (accesso via QR) per inviare ricordi.
- `/display` → kiosk fullscreen 16:9 navigato con le mani (MediaPipe Hands via webcam).

Lingua: UI e commenti in **italiano**. Rispondi all'utente in italiano.

---

## Stack e vincoli

- Vanilla HTML5 + CSS3 + ES Modules nativi. **Niente framework, niente bundler, niente npm build.**
- Dipendenze solo via CDN **con versione fissata**: `@supabase/supabase-js@2.118.0` (+esm, jsDelivr), `@mediapipe/hands@0.4.1675469240` + `@mediapipe/camera_utils@0.3.1675466862`, `@google/model-viewer@3.5.0` (modelli 3D nella modale) (script globali `window.Hands`, `window.Camera`), Google Fonts (Instrument Sans). Le card dei ricordi di testo (`shared/textCard.js`) usano Helvetica con inchiostro sbavato calcolato sui pixel del canvas (funziona anche su Safari iOS).
- Hosting: Vercel statico (`vercel.json`: `cleanUrls`, `trailingSlash`, redirect `/` → `/upload/`). HTTPS obbligatorio per la webcam. Produzione pubblica: **https://memory-mesh-eight.vercel.app** (deploy automatico da push su `main`; l'alias `memory-mesh-geko10` è protetto da login Vercel). Il QR della schermata di attesa (`display/qr-upload.svg`) punta a `/upload/` di questo dominio: se cambia, rigeneralo con `npx qrcode@1.5.4 -t svg -e M -q 1 -d 99251CFF -l 00000000 -o display/qr-upload.svg "<url>/upload/"`.
- Kiosk Windows: `kiosk/avvia-memory-mesh.bat` (Chrome `--kiosk`, profilo dedicato, webcam concessa).
- Dev locale con ricarica automatica: `npx live-server@1.2.2 --port=5173 --host=127.0.0.1 --no-browser` dalla root → http://127.0.0.1:5173/display/ e /upload/ (CSS iniettato a caldo, JS/HTML ricaricano la pagina). In locale `window.__mm` espone `{ state, showIdle() }` e `state.scene.debugInfo()` (accessibili solo dal contesto pagina).
- Supabase **Free Tier**: risparmiare storage e banda è un requisito, non un'ottimizzazione.

## Mappa dei file

```
shared/supabase-config.js   createClient + URL/publishable key. Unica fonte credenziali.
shared/inkBleed.js          Filtro SVG "ink bleed" per titoli/menu (uno per elemento), hover 'pointer' (upload) o 'manual' via setInkHoverPoint (display)
upload/index.html           Step: landing2 (home, senza splash) → info → form (+ overlay successo)
shared/brand/               favicon, apple-touch-icon, og-image.png: logo MM con ink bleed (link condivisi)
upload/app.js               Navigazione step, dropzone, compressione, data AAAA-MM-GG, submit
upload/style.css
display/index.html          canvas scena, video webcam, header, 2 wheel-dock, camera-hud, drawer info, modale dettaglio, toast, cursore virtuale
display/main.js             Orchestratore: Supabase fetch + realtime, callback gesture, menu, modali
display/tracking.js         MediaPipe → eventi astratti; fallback mouse
display/scene.js            Motore Canvas 2D: camera, nodi, 5 layout, render loop
display/wheelMenu.js        Classe WheelMenu2D (voci radiali, setItems, selectValue)
display/inkReveal.js        Testi della modale che compaiono/spariscono a macchia d'inchiostro (filtro SVG animato)
upload/modelOptimizer.js    Alleggerimento .glb nel browser (glTF-Transform 4.5.1 + meshoptimizer 1.3.0, import dinamico)
display/style.css
.antigravity/rules.md       Regole originali per Antigravity IDE (stesso contenuto di questo file, sezione Regole)
```

Contratto tracking → main, gesture e menu per layout: vedi `display/CLAUDE.md` (si carica quando lavori in `display/`).

## Supabase (progetto `memory mesh`, ref `nkymnsfkrmpnkmdyrayd`, eu-west-1)

Tabella `public.memories` (RLS on, in pubblicazione `supabase_realtime`):
| colonna | tipo | note |
|---|---|---|
| id | bigint identity | **numero**, non stringa |
| created_at | timestamptz | default now() = data di invio |
| title | text | max 5 parole (validato solo client) |
| description | text | |
| media_url | text | URL pubblico bucket `uploads` |
| thumb_url | text | miniatura ~400px (WebP/JPEG) usata dal display per i nodi: foto, card di testo, primo frame dei video, anteprima 2D dei modelli 3D (model-viewer all'invio); null per l'audio o se la creazione fallisce (il display ripiega su media_url o sulla card "3D") |
| media_type | text | `image` · `video` · `audio` · `text` · `model3d` |
| tags | text[] | 1–3 tag tematici minuscoli |
| location_tag | text | stanza (minuscolo) |
| time_event | date | data dell'evento (opzionale) |
| privacy_consent | bool | deve essere true |

Policy: `anon` INSERT su memories se `privacy_consent = true`; `anon` SELECT tutto; `anon` INSERT su storage bucket `uploads` (pubblico, nessun limite dimensione/MIME lato server).

**Vocabolari controllati** (devono restare allineati tra upload e display):
- Tag tematici (`upload/index.html #theme-chips` ↔ `scene.js CLUSTER_PALETTE`): studio, evento, vita comune, fede, musica, amici, relax, cibo, arte, festa, carità.
- Luoghi (`upload/index.html #location-chips` ↔ `scene.js FLOORS`): cucina, sala del re, studio, ghiacciaia, giardino (terra; 'esterno' eliminato l'11/11 da upload, display e CHECK) · sala conferenze, camere (primo) · mansarda, cappellina (secondo).

## Regole di sviluppo

0. Decisioni di progetto: niente moderazione; date = `time_event`, fallback `created_at`; video autoplay muto; i ricordi `FALLBACK_MEMORIES` in `main.js` sono solo demo (mostrati se il DB è vuoto, sostituiti al primo ricordo reale). In futuro: mini stampante che stampa i nuovi ricordi.

1. **Modifica solo i file del task.** Non riscrivere o riformattare file interi. Mantieni la separazione: `tracking.js` = gesture, `scene.js` = rendering, `main.js` = orchestrazione/dati/realtime, `shared/` = config comune.
2. **Kiosk resilience (/display):** mai `alert()`, `confirm()`, `prompt()` o popup bloccanti. Errori di rete o perdita del tracking → fallimento silenzioso o indicatore discreto. Nessun memory leak: un solo loop rAF per scopo, cancellare rAF/listener/media quando non servono più.
3. **Storage efficiente (/upload):** immagini compresse via Canvas prima dell'upload (WebP/JPEG, lato lungo ≤1920px, qualità 0.8 a scendere). Mai caricare originali pesanti.
4. **Realtime:** un unico `supabase.channel()` su `INSERT` di `memories`. Niente polling con `setInterval`.
5. **Dati sempre con fallback:** `m.tags || []`, `m.title || 'Senza titolo'`, ecc. Confronta gli id con `String(a) === String(b)`.
6. **Stile:** palette bordeaux `#99251C` su panna `#F9F6F0` / `#FFFDF9`, bordi `#EADBCE`; titoli e menu in Helvetica (`--font-serif`) con effetto ink bleed di `shared/inkBleed.js` (mai maiuscolo; nuovi titoli → aggiungi la classe al selettore di `initInkBleed`), testi Instrument Sans. Le etichette canvas di `scene.js` usano Helvetica bold senza filtro. Usa le CSS custom properties già definite in `:root`.
7. Se aggiungi un tag o una stanza, aggiornalo **in entrambi** i front-end (vedi vocabolari) **e nei CHECK del database**.
8. Nessun segreto nel codice oltre alla publishable key. Niente service_role key nel client.

## Problemi noti (backlog — verificare prima di toccare queste aree)

- [x] Video: autoplay muto in loop all'apertura (scelta di progetto). [ ] Audio: controlli nativi non azionabili con gesture.
- [x] Miniature: l'upload crea `thumb_url` (~400px) per foto, card di testo e video; il display (`scene.js preloadMedia`) la usa al posto del file pieno. I ricordi precedenti hanno le miniature in `uploads/thumbs/<id>.webp`.
- [x] Riconnessione realtime (retry 5s). [x] Webcam: riavvio automatico (track `ended`, watchdog 8s senza frame, retry 10s se assente). [x] Schermata di attesa dopo 5 s senza mani (45 s con `?mouse=1`), titolo + QR + istruzioni, chiusa salutando (tastiera per manutenzione); la webcam resta accesa e visibile sopra lo standby (D24).
- [x] Limiti server-side: bucket 10 MB + MIME ammessi (webp/jpeg, video mp4/mov/webm, audio, gltf); CHECK su `memories` (titolo ≤5 parole, tag/luoghi del vocabolario, media_type, URL del bucket). **Se aggiungi un tag o una stanza, aggiorna anche i CHECK `memories_tags_check` / `memories_location_check`.** Moderazione: **scelta di progetto, NESSUNA approvazione**.
- [x] `alert()` sostituito da messaggio in pagina + 3 tentativi. [~] File orfani se l'insert fallisce: la vista `public.orphan_uploads` (solo dashboard, non esposta ad anon) li elenca; si cancellano a mano da Storage > uploads (Supabase blocca il DELETE via SQL).
- [x] **Compressione:** Safari iOS non codifica WebP via canvas e restituiva PNG pesanti con estensione .webp → ora fallback JPEG verificando `blob.type`.
- [ ] **Planimetria provvisoria:** stanze e coordinate in `FLOORS` non definitive (la Sala del Re ha preso il posto del vecchio Salone Centrale, coordinate da rifare).
- [x] **Crash webcam/ricariche (11/11):** fotogrammi inviati solo con video pronto, errori di invii vecchi ignorati, 1-2 errori isolati tollerati, MediaPipe bloccato >6s = ricarica; dopo 5 ricariche in 10 min pausa e nuovo tentativo dopo 10 min; riavvio preventivo dopo 45 min solo in attesa; senza rete le ricariche aspettano che torni la connessione. Registro incidenti: `JSON.parse(localStorage['mm-incidents'])` nella console del kiosk.

Quando risolvi un punto, spuntalo qui.
