/**
 * Hand Tracking — MediaPipe Hands wrapper
 *
 * Responsibilities:
 *  - Initialise webcam feed
 *  - Run MediaPipe Hands detection loop
 *  - Expose hand landmarks via callback / event
 */

/**
 * Initialise hand tracking on the given <video> element.
 * @param {HTMLVideoElement} videoEl
 * @param {(landmarks: Array) => void} onResults
 */
export function initTracking(videoEl, onResults) {
  // TODO: setup MediaPipe Hands via CDN
  console.log('[tracking] initTracking stub');
}
