# MODIFICHE

<!-- Formato: - [ ] ID · DOVE · ORA → VOGLIO · (file se noto)
     Stato: [ ] da fare · [x] fatto · [?] da chiarire
     Priorità: !! = prima dell'evento, ! = utile, niente = dopo
     Testi definitivi tra "virgolette". Immagini solo in inspo/, citate col nome file. -->

## Display

- [ ] D32 !! · gesture · provare sul PC del kiosk lo scambio delle mani (D19): destra sposta, sinistra seleziona
- [ ] D33 !! · test memorie · decidere se eliminare prima dell'evento le 5 memorie [TEST] (id 14–18, file in uploads/test/) e le 10 demo (id 19–28, file in uploads/demo/)

## Upload

## Kiosk / PC

## Fatto

<!-- Sposto qui le voci completate con l'ID, così non le rileggo -->

- [x] D1 · titolo 2.8→3.64rem, sottotitolo 0.72→0.94rem · (display/style.css)
- [x] D2 · tasto INFO e drawer rimossi; tasto "i" apre le info del titolo · (display/index.html, style.css, main.js)
- [x] D3 · webcam 168×112 → 252×168 · (display/style.css, index.html)
- [x] D4 · hover/click sulla webcam → guida gesture sopra il riquadro; vicino alla webcam il menu sinistro non si apre · (display/index.html, style.css, main.js)
- [x] D5 · hover/click sul titolo → pannello testo + QR + "esplora", a righe con filetti (niente bento) · (display/index.html, style.css, main.js)
- [x] D6 · linee a bordo schermo, una per voce, stessa inclinazione; attiva lunga e piena, vicine medie; spariscono quando il menu è aperto · (display/wheelMenu.js, style.css)
- [x] D7 · mirino: filtro One Euro + movimento a 60fps (prima lerp 0.16 a ~20fps = ~0,6s di ritardo); zona attiva centrale della webcam; MediaPipe modello lite a 640×480 · (display/tracking.js)
- [x] D9 · contatore prestazioni: tasto F o /display/?fps=1 → webcam, MediaPipe, schermo, GPU e collo di bottiglia · (display/main.js, tracking.js, style.css)
- [x] D10 · MediaPipe analizza solo i fotogrammi nuovi (prima rianalizzava lo stesso a ogni aggiornamento dello schermo, 120/s con webcam a 30) → meno carico sul PC · (display/tracking.js)
- [x] D12 · recupero automatico: webcam scollegata/bloccata → riavvio webcam; errore MediaPipe o più di 3 riavvii in 2 min → la pagina si ricarica (max 5 volte in 10 min); riga "Riavvii" nel contatore · (display/tracking.js, main.js)
- [x] D13 · attesa: si chiude solo salutando verso la webcam (mano aperta, destra-sinistra-destra); per manutenzione anche tastiera e click; QR fermo; testo "saluta con la mano" · (display/tracking.js, main.js, index.html, style.css)
- [x] D14 · mirino: la zona 48–92% (orizzontale) e 12–76% (verticale) della webcam copre tutto lo schermo · (display/tracking.js POINTER_X_RANGE / POINTER_Y_RANGE)
- [x] D15 · webcam: anteprima più luminosa e contrastata (velatura scura tolta) + luminosità/contrasto alzati sulla webcam se il driver lo consente · (display/tracking.js)
- [x] D16 · cluster: contorni organici a goccia che avvolgono i ricordi e si fondono quando sono vicini (inspo "visualizzazione sezioni.png") · (display/scene.js)
- [x] D17 · menu: tolto il pallino; linee del menu chiuso arrotondate e più spesse · (display/style.css)
- [x] D18 · mouse eliminato: eventi bloccati e cursore nascosto; solo /display/?mouse=1 lo riattiva per manutenzione · (display/main.js, style.css)
- [x] D19 · mani scambiate: destra = puntatore + pinch per spostare la vista, sinistra = pinch per selezionare (+ zoom col polso) · (display/tracking.js, main.js, index.html)
- [x] D20 · cluster: niente linee tra i ricordi, solo le isole · (display/scene.js)
- [x] D21 · filtro cluster: restano solo i ricordi del tag scelto, a griglia, e la vista si centra sul cluster · (display/scene.js)
- [x] D22 · nodi: collegamenti solo per tag condiviso, colorati per tag; in hover il nome del tag sulla linea · (display/scene.js)
- [x] D23 · planimetria: ricordi dentro la propria stanza e solo sul piano di quella stanza; cambiando piano si aggiornano · (display/scene.js)
- [x] D24 · standby: la webcam resta accesa e visibile sopra la schermata di attesa · (display/main.js, style.css)
- [x] D25 · timeline: tolte le scritte in hover sotto gli anni · (display/scene.js)
- [x] D26 · timeline: l'anno aperto resta alla stessa altezza della timeline generale · (display/scene.js)
- [x] D27 · timeline: niente tasto, solo l'anno scritto dopo DIC (pinch sull'anno per chiudere) · (display/scene.js)
- [x] D28 · ink bleed in hover su tutte le scritte (filtro a riposo solo su titoli e menu) · (shared/inkBleed.js, display/main.js)
- [x] D29 · audio: forma d'onda reale del file a barre, parte da solo, comandi Pausa/tempo solo in hover (anche sul video); pinch sull'onda = salta lì · (display/audioWave.js, main.js, index.html, style.css)
- [x] D30 · memorie testuali: card con testo in corsivo (Caveat) trattate come foto 2D, sia nel display sia nell'immagine creata dall'upload · (shared/textCard.js, display/scene.js, main.js, upload/app.js, index.html)
- [x] D31 · caricate 5 memorie [TEST]: 2 video CC0 (MDN) e 3 modelli 3D (Khronos: papera, volpe, avocado) · (Supabase, bucket uploads/test/)
- [x] D34 · ripristinate nel database le 10 memorie demo (6 foto, 3 audio, 1 testo; senza il video doppione) → 15 memorie in tutto · (Supabase, bucket uploads/demo/)
