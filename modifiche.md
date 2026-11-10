# MODIFICHE

<!-- Formato: - [ ] ID · DOVE · ORA → VOGLIO · (file se noto)
     Stato: [ ] da fare · [x] fatto · [?] da chiarire
     Priorità: !! = prima dell'evento, ! = utile, niente = dopo
     Testi definitivi tra "virgolette". Immagini solo in inspo/, citate col nome file. -->

## Display

- [ ] D18 !! · gesture · provare sul kiosk: saluto per chiudere l'attesa, mirino con la mano destra nella metà destra, luminosità webcam [?]

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
