/**
 * Display App — entry point
 *
 * Orchestrates:
 *  1. Supabase data fetch (memories)
 *  2. Hand-tracking initialisation (tracking.js)
 *  3. Canvas scene rendering (scene.js)
 */

import { supabase } from '../shared/supabase-config.js';
import { initTracking } from './tracking.js';
import { initScene } from './scene.js';

console.log('[display] main loaded — supabase client ready');
