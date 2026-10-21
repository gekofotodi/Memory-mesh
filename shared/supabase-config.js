/**
 * Supabase client — shared configuration
 *
 * Both /upload and /display import this module so credentials
 * live in a single place.
 *
 * Usage (from an HTML file one level up):
 *   import { supabase } from '../shared/supabase-config.js';
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ── Credentials ──────────────────────────────────────────────
// Replace with your own Supabase project values.
const SUPABASE_URL = 'https://nkymnsfkrmpnkmdyrayd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rVkZHl2lJDe56MqOqdo8XQ_0ilCgyIz';

// ── Client ───────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
