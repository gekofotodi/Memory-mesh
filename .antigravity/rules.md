# Regole di Progetto & Linee Guida Operative: Memory Mesh

Questo documento stabilisce i principi architetturali, i vincoli tecnici e le convenzioni di sviluppo per il progetto "Memory Mesh". L'assistente deve adattare autonomamente il proprio approccio in base al contesto del task.

---

## 1. Auto-Routing del Ruolo Operativo (Context Detection)

L'agente deve determinare autonomamente il dominio di intervento senza prompt espliciti:

- **Se il prompt riguarda `/upload`, form, validazione, input utente o consenso:**
  - *Comportamento:* Adotta l'approccio Mobile-First, accessibilità, gestione rigorosa della privacy, compressione asincrona lato client prima dell'upload e UX a basso attrito.
- **Se il prompt riguarda `/display`, canvas, MediaPipe, rendering o animazioni:**
  - *Comportamento:* Adotta l'approccio Kiosk Mode, performance grafica a frame rate stabile (30–60 FPS), gestione del budget di memoria, smorzamento numerico dei segnali e prevenzione di layout shift o crash del browser.
- **Se il prompt riguarda Supabase, chiamate di rete o strutture dati:**
  - *Comportamento:* Adotta l'approccio Data Integrity, minimizzazione del consumo di quota Free Tier, gestione robusta di errori di rete offline/timeout e sincronizzazione real-time senza polling ridondante.
- **Se il task tocca più ambiti contemporaneamente:**
  - *Comportamento:* Separa chiaramente le modifiche per cartella (`/shared`, `/upload`, `/display`), garantendo il principio di singola responsabilità per ciascun modulo.

---

## 2. Architettura & Stack Tecnologico

- **Paradigma:** Vanilla Web Technologies (HTML5 semantico, CSS3 moderno, ES Modules). Nessun framework pesante (niente React/Vue/Vite) a meno che non sia strettamente richiesto per build complesse.
- **Backend & Realtime:** Supabase via CDN ufficiale ES Module.
  - Tabella: `memories` (campi flessibili: `title`, `description`, `media_url`, `media_type`, `tags` (array), `location_tag`, `time_event`, `privacy_consent`).
  - Storage: Bucket pubblico `uploads`.
- **Hosting & Protocollo:** Static Hosting (Vercel / GitHub Pages) su protocollo obbligatorio **HTTPS** (necessario per l'accesso a webcam e permessi multimediali).

---

## 3. Vincoli di Efficienza e Ottimizzazione Risorse

1. **Gestione del Free Tier di Storage:**
   - Qualsiasi file multimediale (immagine) acquisito o selezionato da `/upload` DEVE essere ridimensionato e convertito in formato compresso (es. WebP o JPEG qualità 0.75-0.80, max 1920px sul lato lungo) prima dell'upload a Supabase. Nessun file originale > 2 MB deve essere trasmesso.
2. **Kiosk Resilience (/display):**
   - L'applicazione display non deve mai generare `alert()`, `confirm()` o popup modali bloccanti nativi del browser.
   - Ogni errore di rete o tracking perso deve fallire silenziosamente o degradare visivamente con un indicatore non invasivo.
   - Evitare memory leak: rimuovere event listener inutilizzati, cancellare frame di animazione su disconnessione e rilasciare texture/materiali non più in scena.
3. **Sincronizzazione Realtime Efficiente:**
   - Usa un unico canale `supabase.channel()` per ascoltare i nuovi inserimenti (`INSERT`) sulla tabella `memories`.
   - Evita chiamate ripetute a intervalli regolari (`setInterval` per fetch); affidati esclusivamente al listener in tempo reale o alla fetch iniziale di bootstrap.

---

## 4. Convenzioni di Codice e Manutenibilità

- **Modularità:** 
  - La logica del tracking/input, la gestione della scena visuale e i dati devono risiedere in file separati (`tracking.js`, `scene.js`, `main.js`).
  - Le credenziali e le istanze condivise di Supabase risiedono unicamente in `/shared/supabase-config.js` ed esportate come modulo.
- **Resilienza alle Modifiche di Schema:**
  - I componenti front-end che leggono i dati devono sempre gestire valori di fallback (es. `memory.tags || []`, `memory.title || "Senza titolo"`), in modo da supportare sia dati storici incompleti sia nuove proprietà aggiunte in corso d'opera.
- **Nessuna dipendenza hardcoded dalle gesture:**
  - I moduli di input devono esporre eventi generici (es. `onPointerMove(x, y)`, `onSelect()`, `onNavigate(delta)`) verso la scena visiva, mantenendo la logica grafica completamente disaccoppiata dall'algoritmo di visione artificiale sottostante.