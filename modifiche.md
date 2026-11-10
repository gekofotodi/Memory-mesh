# MODIFICHE

<!-- Formato: - [ ] ID · DOVE · ORA → VOGLIO · (file se noto)
     Stato: [ ] da fare · [x] fatto · [?] da chiarire
     Priorità: !! = prima dell'evento, ! = utile, niente = dopo
     Testi definitivi tra "virgolette". Immagini solo in inspo/, citate col nome file. -->

## Display

- [ ] D8 !! · gesture · sul PC del kiosk premi F e mandami i numeri del contatore (soprattutto "Collo di bottiglia") → il mirino va ancora a scatti [?]

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
