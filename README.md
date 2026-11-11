# Memory Mesh

Archivio di memoria comunitaria e installazione interattiva per il **Centro Giovanile Stoà**.
Il pubblico invia ricordi (foto, video, audio, testi, modelli 3D) dal telefono tramite un QR; un kiosk a schermo intero li mostra come una rete navigabile con le mani, davanti a una webcam.

- Upload (da telefono): https://memory-mesh-eight.vercel.app/upload/
- Display (kiosk): https://memory-mesh-eight.vercel.app/display/

## Struttura

```
shared/    supabase-config.js (client e chiave pubblica), inkBleed.js (effetto inchiostro su titoli e menu)
upload/    web app mobile: landing → scopri il progetto → modulo di invio
display/   kiosk 16:9: scena Canvas 2D, hand tracking MediaPipe, menu radiali, schermata di attesa con QR
kiosk/     avvia-memory-mesh.bat (Chrome in modalità kiosk su Windows)
```

## Stack

| Livello | Tecnologia |
|---|---|
| Front-end | HTML, CSS ed ES Modules nativi, senza framework né build |
| Dipendenze | solo da CDN con versione fissata: supabase-js 2.118.0, MediaPipe Hands, model-viewer 3.5.0 |
| Backend | Supabase (tabella `memories`, bucket `uploads`, Realtime) |
| Hosting | Vercel statico, deploy automatico a ogni push su `main` |

## Upload

- Tipi di ricordo: immagine, video, audio, testo (diventa una card citazione), modello 3D `.glb`.
- Le immagini sono compresse nel browser (lato lungo ≤ 1920 px, WebP o JPEG su iOS); video, audio e 3D fino a 10 MB. I `.glb` più pesanti si possono alleggerire nel browser prima dell'invio.
- Campi: titolo (max 5 parole), descrizione, 1–3 tag tematici, luogo dello Stoà, data dell'evento (facoltativa), consenso privacy.
- Nessuna moderazione: il ricordo compare subito sul display.

## Display

- Cinque visualizzazioni: **Nodi** (nuvola 3D), **Cluster** (per tag), **Planimetria** (per piano e stanza), **Timeline** (per anno), **Griglia** (ordinabile).
- Gesture: la mano destra muove il mirino e, con il pinch prolungato, sposta la vista; la mano sinistra seleziona con il pinch e fa zoom inclinando il polso.
- Dopo 45 secondi senza nessuno compare la schermata di attesa con titolo e QR; si chiude salutando con la mano.
- I nuovi ricordi arrivano in tempo reale (Supabase Realtime) con un'onda sulla scena.
- Resilienza: riavvio automatico della webcam e di MediaPipe, ricarica della pagina solo con la rete disponibile, riavvio preventivo ogni 45 minuti durante l'attesa. Registro incidenti nella console del kiosk: `JSON.parse(localStorage['mm-incidents'])`.
- Manutenzione: `/display/?mouse=1` riattiva il mouse; tasti `1-5` layout, `I` info, `W` onda, `Esc` chiudi.

## Kiosk

Su Windows avvia `kiosk/avvia-memory-mesh.bat`: apre Chrome a schermo intero in un profilo dedicato, con la webcam già concessa. Per uscire: Alt+F4.

## Sviluppo locale

```bash
npx live-server@1.2.2 --port=5173 --host=127.0.0.1 --no-browser
```

Poi apri http://127.0.0.1:5173/display/ e http://127.0.0.1:5173/upload/. La webcam funziona su `localhost` o in HTTPS.

## Supabase

Progetto `memory mesh` (eu-west-1), piano gratuito: risparmiare spazio e banda è un requisito.

- Tabella `public.memories` con RLS: lettura pubblica, inserimento solo con `privacy_consent = true`; vincoli CHECK su titolo, tag, luoghi, tipo di media e URL.
- Bucket pubblico `uploads`: limite 10 MB e solo i formati ammessi.
- Tag e luoghi sono vocabolari controllati: se ne aggiungi uno, aggiornalo in `upload/index.html`, in `display/scene.js` e nei CHECK del database.

Dettagli tecnici, mappa dei file e backlog in [CLAUDE.md](CLAUDE.md).
