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
- Dipendenze solo via CDN **con versione fissata**: `@supabase/supabase-js@2.118.0` (+esm, jsDelivr), `@mediapipe/hands@0.4.1675469240` + `@mediapipe/camera_utils@0.3.1675466862`, `@google/model-viewer@3.5.0` (modelli 3D nella modale) (script globali `window.Hands`, `window.Camera`), Google Fonts (Instrument Sans; Instrument Serif solo per la card citazione generata in `upload/app.js`).
- Hosting: Vercel statico (`vercel.json`: `cleanUrls`, `trailingSlash`). HTTPS obbligatorio per la webcam. Produzione pubblica: **https://memory-mesh-eight.vercel.app** (deploy automatico da push su `main`; l'alias `memory-mesh-geko10` è protetto da login Vercel). Il QR della schermata di attesa (`display/qr-upload.svg`) punta a `/upload/` di questo dominio: se cambia, rigeneralo con `npx qrcode@1.5.4 -t svg -e M -q 1 -d 99251CFF -l 00000000 -o display/qr-upload.svg "<url>/upload/"`.
- Kiosk Windows: `kiosk/avvia-memory-mesh.bat` (Chrome `--kiosk`, profilo dedicato, webcam concessa).
- Dev locale con ricarica automatica: `npx live-server@1.2.2 --port=5173 --host=127.0.0.1 --no-browser` dalla root → http://127.0.0.1:5173/display/ e /upload/ (CSS iniettato a caldo, JS/HTML ricaricano la pagina). In locale `window.__mm` espone `{ state, showIdle() }` e `state.scene.debugInfo()` (accessibili solo dal contesto pagina).
- Supabase **Free Tier**: risparmiare storage e banda è un requisito, non un'ottimizzazione.

## Mappa dei file (righe ≈)

```
shared/supabase-config.js   (19)   createClient + URL/publishable key. Unica fonte credenziali.
shared/inkBleed.js          (318)  Filtro SVG "ink bleed" per titoli/menu (uno per elemento), hover 'pointer' (upload) o 'manual' via setInkHoverPoint (display)
upload/index.html           (355)  Step: landing → landing2 → info → form (+ overlay successo)
upload/app.js               (1182) Navigazione step, dropzone, compressione, data AAAA-MM-GG, submit
upload/style.css            (1188)
display/index.html          (277)  canvas scena, video webcam, header, 2 wheel-dock, camera-hud, drawer info, modale dettaglio, toast, cursore virtuale
display/main.js             (1501) Orchestratore: Supabase fetch + realtime, callback gesture, menu, modali
display/tracking.js         (836)  MediaPipe → eventi astratti; fallback mouse
display/scene.js            (2704) Motore Canvas 2D: camera, nodi, 5 layout, render loop
display/wheelMenu.js        (223)  Classe WheelMenu2D (voci radiali, setItems, selectValue)
display/inkReveal.js        (122)  Testi della modale che compaiono/spariscono a macchia d'inchiostro (filtro SVG animato)
upload/modelOptimizer.js    (87)   Alleggerimento .glb nel browser (glTF-Transform 4.5.1 + meshoptimizer 1.3.0, import dinamico)
display/style.css           (1349)
.antigravity/rules.md              Regole originali per Antigravity IDE (stesso contenuto di questo file, sezione Regole)
```

### `display/scene.js` — sezioni
- 15 `FLOORS` (stanze per piano, coordinate mondo) · 50 `CLUSTER_PALETTE` (colore per tag)
- 96 `initScene(canvas)` → stato camera/nodi · 304 fabric wave · 327 `parseMemoryDate`
- 399 `setMemories` / 491 `addMemory` (preload immagini, primo frame video in `imageCache`)
- 563 `recalculateLayoutTargets()` — uno `case` per layout: `nodi` (nuvola 3D), `cluster`, `planimetria`, `timeline`, `griglia`
- 1006 `fitCurrentLayout` · 1037 mode switchers (`setLayout`, `setFloor`, `setTimelineYear`, `setClusterTag`, `setGridSort`)
- 1210 `pan`/`zoom` · 1332 `hitTest` · 1356 `updateCloud` (nuvola nodi) · 1391 `update` · 1549 `render` (rAF)
- 1622 `planPhase` (animazione piani) · 1679 disegno planimetria · 1938 contorni cluster · 2528 miniature

### Contratto tracking → main (non legare la scena alle gesture)
`initTracking({videoEl, canvasEl, callbacks})` emette: `onPointerMove(x,y)`, `onSelect()`, `onPan(dx,dy)`, `onZoom(factor)`, `onHandStateChange(left,right)`.
- Mano **destra** fisica (label MediaPipe `Left`, camera specchiata): l'indice muove il puntatore (One Euro); pinch prolungato = pan con inerzia, puntatore congelato durante il pan (D19).
- Mano **sinistra** fisica: pinch (isteresi 0.28/0.38, hold) = select sul punto del mirino; polso inclinato >20° a mano aperta = zoom continuo.
- Mouse disattivato sul display (D18): eventi bloccati in cattura e cursore nascosto. Solo `/display/?mouse=1` lo riattiva per manutenzione/test (click = select, rotella = zoom).

### Layout e menu destro contestuale (`main.js → activateLayout`)
| Layout | Menu destro |
|---|---|
| `nodi` | nessuno (nascosto) |
| `cluster` | tag presenti nei dati → `setClusterTag` |
| `planimetria` | Piano Terra / Primo / Secondo → `setFloor` |
| `timeline` | Tutti gli anni + anni → `setTimelineYear` |
| `griglia` | ordina per Data / Media / Tag / Luogo → `setGridSort` |

I menu compaiono per prossimità del puntatore ai bordi (enter 240px, leave 380px). Tasti kiosk: `1-5` layout, `I` info, `W` onda, `Esc` chiudi.

## Supabase (progetto `memory mesh`, ref `nkymnsfkrmpnkmdyrayd`, eu-west-1)

Tabella `public.memories` (RLS on, in pubblicazione `supabase_realtime`):
| colonna | tipo | note |
|---|---|---|
| id | bigint identity | **numero**, non stringa |
| created_at | timestamptz | default now() = data di invio |
| title | text | max 5 parole (validato solo client) |
| description | text | |
| media_url | text | URL pubblico bucket `uploads` |
| media_type | text | `image` · `video` · `audio` · `text` · `model3d` |
| tags | text[] | 1–3 tag tematici minuscoli |
| location_tag | text | stanza (minuscolo) |
| time_event | date | data dell'evento (opzionale) |
| privacy_consent | bool | deve essere true |

Policy: `anon` INSERT su memories se `privacy_consent = true`; `anon` SELECT tutto; `anon` INSERT su storage bucket `uploads` (pubblico, nessun limite dimensione/MIME lato server).

**Vocabolari controllati** (devono restare allineati tra upload e display):
- Tag tematici (`upload/index.html #theme-chips` ↔ `scene.js CLUSTER_PALETTE`): studio, evento, vita comune, fede, musica, amici, relax, cibo, arte, festa, carità.
- Luoghi (`upload/index.html #location-chips` ↔ `scene.js FLOORS`): cucina, sala del re, studio, ghiacciaia, giardino, esterno (terra) · sala conferenze, camere (primo) · mansarda, cappellina (secondo).

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

- [x] **Doppio inserimento realtime:** `scene.setMemories` tiene la stessa reference di `state.memories`; nel listener `main.js` fa `unshift` e poi `scene.addMemory` fa di nuovo `unshift` → ricordo duplicato nell'array e contatore +2. Anche l'onda parte due volte.
- [x] **Related chip via gesture non funziona con id numerici:** `handleSelect` confronta `m.id === dataset.id` (numero vs stringa).
- [x] **`sala del re` non esiste in `FLOORS`** → quei ricordi spariscono in planimetria. I ricordi di fallback usano luoghi inesistenti (Portico, Sala Studio, Salone) e tag fuori vocabolario.
- [x] **Data:** modale e timeline usano `created_at` (invio) prima di `time_event` (evento).
- [x] **`model3d` (glb/gltf)** accettato in upload ma non gestito nel display (modale prova a mostrarlo come immagine).
- [x] **Card testo:** l'upload genera un'immagine della citazione, ma il display mostra solo il placeholder "MEMORIA".
- [x] Video: autoplay muto in loop all'apertura (scelta di progetto). [ ] Audio: controlli nativi non azionabili con gesture.
- [ ] Miniature caricano il file pieno (fino a 1920px) per disegnare ~86px; nessuna thumbnail dedicata.
- [x] CDN non versionate (`supabase-js`, `@mediapipe/*`) → un rilascio upstream può rompere il kiosk.
- [x] Riconnessione realtime (retry 5s). [x] Webcam: riavvio automatico (track `ended`, watchdog 8s senza frame, retry 10s se assente). [x] Schermata di attesa dopo 45s (titolo + QR), chiusa salutando (tastiera per manutenzione); la webcam resta accesa e visibile sopra lo standby (D24).
- [x] Limiti server-side: bucket 10 MB + MIME ammessi (webp/jpeg, video mp4/mov/webm, audio, gltf); CHECK su `memories` (titolo ≤5 parole, tag/luoghi del vocabolario, media_type, URL del bucket). **Se aggiungi un tag o una stanza, aggiorna anche i CHECK `memories_tags_check` / `memories_location_check`.** Moderazione: **scelta di progetto, NESSUNA approvazione**.
- [x] `alert()` sostituito da messaggio in pagina + 3 tentativi. [ ] File orfani se l'insert fallisce (serve una policy DELETE: non aperta ad anon per sicurezza).
- [x] **Compressione:** Safari iOS non codifica WebP via canvas e restituiva PNG pesanti con estensione .webp → ora fallback JPEG verificando `blob.type`.
- [x] Timeline/griglia/cluster: inquadratura automatica (`fitCameraToContent` in `scene.js`), cluster parte da "Tutti i temi".
- [x] Anello progresso cursore: perimetro 125.6 calcolato con r=20 ma il cerchio SVG ha r=18.
- [x] Fallback mouse di `tracking.js` non aggiunge più listener (li gestisce `main.js`).
- [ ] **Planimetria provvisoria:** stanze e coordinate in `FLOORS` non definitive (la Sala del Re ha preso il posto del vecchio Salone Centrale, coordinate da rifare).
- [x] README allineato all'implementazione (11/11).
- [x] **Crash webcam/ricariche (11/11):** fotogrammi inviati solo con video pronto, errori di invii vecchi ignorati, 1-2 errori isolati tollerati, MediaPipe bloccato >6s = ricarica; dopo 5 ricariche in 10 min pausa e nuovo tentativo dopo 10 min; riavvio preventivo dopo 45 min solo in attesa; senza rete le ricariche aspettano che torni la connessione. Registro incidenti: `JSON.parse(localStorage['mm-incidents'])` nella console del kiosk.

Quando risolvi un punto, spuntalo qui.
