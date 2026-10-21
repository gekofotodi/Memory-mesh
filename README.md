# Memory Mesh

**Interaction Design installation** — raccoglie ricordi dal pubblico tramite web app mobile e li visualizza in un'installazione interattiva a schermo intero controllata via gesture.

## Architettura

```
memory-mesh/
├── shared/              → Config condivisa (Supabase client)
├── upload/              → Web app mobile-first per invio ricordi
├── display/             → Installazione kiosk fullscreen + hand tracking
├── .antigravity/        → Regole di progetto per l'AI assistant
└── .gitignore
```

### `/upload` — Invio ricordi
- Form con testo, immagine/video, consenso privacy
- Upload media su **Supabase Storage** (bucket `uploads`)
- Insert record nella tabella **`memories`**

### `/display` — Installazione interattiva
- Canvas grafico a schermo intero (16:9 landscape)
- Hand tracking via **MediaPipe Hands** (webcam)
- Fetch dei ricordi da Supabase e rendering interattivo

### `/shared` — Configurazione
- Client Supabase inizializzato una sola volta, importato da entrambi i front-end via ES Module

## Stack

| Layer     | Tecnologia                     |
|-----------|--------------------------------|
| Front-end | Vanilla HTML / CSS / JS (ES Modules) |
| Backend   | Supabase (PostgreSQL + Storage) |
| Tracking  | MediaPipe Hands (CDN)          |
| Hosting   | Statico (qualsiasi CDN/server) |

## Setup

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Copia URL e anon key in `shared/supabase-config.js`.
3. Crea la tabella `memories` e il bucket `uploads` su Supabase.
4. Servi i file con un server statico locale:
   ```bash
   npx serve .
   ```
5. Apri `/upload/` da mobile e `/display/` sul display dell'installazione.
