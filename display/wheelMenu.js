/**
 * Wheel Menu 2D Module — Perpetual Radial Ray Wheel (Ruota a Raggi Perpetua)
 *
 * Requirements & Features:
 *  1. Perpetual repeating loop around the wheel (endless circular wrap).
 *  2. Double-space gap (spazio ampio il doppio) between each repeating group.
 *  3. Auto-rotation when cursor approaches the outer buttons (top/bottom extremes).
 *  4. Radial spokes: all labels radiate from an external hub outside the screen.
 *  5. Symmetrical design: identical margin from screen border on both sides,
 *     with green dot on the left for Left Wheel and on the right for Right Wheel.
 *  6. Pure Helvetica typography, black text (#000000), bright green dot (#00E676).
 */

export class WheelMenu2D {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {string} options.itemsSelector
   * @param {string} options.valueAttr
   * @param {'left' | 'right'} options.side
   * @param {(value: string) => void} options.onSelect
   */
  constructor({ container, itemsSelector = '.wheel-btn', valueAttr = 'data-layout', side = 'left', onSelect = () => {} }) {
    this.container = container;
    this.valueAttr = valueAttr;
    this.side = side;
    this.onSelect = onSelect;

    // Grab template items from initial DOM
    const rawButtons = Array.from(container.querySelectorAll(itemsSelector));
    if (rawButtons.length === 0) return;

    this.templates = rawButtons.map((btn, index) => ({
      index,
      value: btn.getAttribute(this.valueAttr) || '',
      label: btn.getAttribute('aria-label') || '',
      html: btn.innerHTML,
      isActive: btn.classList.contains('is-active'),
    }));

    this.itemCount = this.templates.length;

    // Requirement 2: Double-space gap between groups
    // If consecutive items have 1 slot spacing, an extra slot makes the gap 2x wider
    this.cycleLength = this.itemCount + 1;

    // Radial Wheel Geometry
    this.pivotRadius = 540; // Distance of the external hub from screen border
    this.edgeMargin = 20;   // Distance of active item from screen border
    this.angleStep = 0.07;  // Pitch between items (~4.01° / ~39px)

    // Perpetual State
    this.currentOffset = 0;
    this.targetOffset = 0;
    this.animId = null;
    this.activeValue = null;

    // Auto-spin state (Requirement 3: rotate when cursor approaches outer buttons)
    this.isAutoSpinning = false;
    this.autoSpinSpeed = 0;

    // Find initial active index
    const initialActive = this.templates.find((t) => t.isActive) || this.templates[0];
    this.currentIndex = initialActive.index;
    this.currentOffset = initialActive.index;
    this.targetOffset = initialActive.index;
    this.activeValue = initialActive.value;

    // Build the perpetual DOM (7 repeating sets to ensure seamless buffer)
    this.buildPerpetualDOM();
    this.bindEvents();
    this.update();
  }

  buildPerpetualDOM() {
    this.arc = this.container.querySelector('.wheel-arc') || this.container;
    this.arc.innerHTML = '';
    this.allButtons = [];

    // 7 sets: k from -3 to +3
    const setRange = [-3, -2, -1, 0, 1, 2, 3];

    setRange.forEach((k) => {
      this.templates.forEach((tmpl) => {
        const btn = document.createElement('button');
        btn.className = 'wheel-btn';
        if (tmpl.value === this.activeValue) {
          btn.classList.add('is-active');
        }
        btn.setAttribute(this.valueAttr, tmpl.value);
        if (tmpl.label) btn.setAttribute('aria-label', tmpl.label);
        btn.innerHTML = tmpl.html;

        // Base slot position along the endless wheel
        btn._basePos = k * this.cycleLength + tmpl.index;
        btn._originalIndex = tmpl.index;
        btn._value = tmpl.value;

        // Click on any visible button explicitly selects and centers it
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.hasDragged) return;
          this.stopAutoSpin();
          this.selectValue(btn._value, btn._basePos);
        });

        this.arc.appendChild(btn);
        this.allButtons.push(btn);
      });
    });
  }

  bindEvents() {
    // 1. Mouse wheel rotation
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.stopAutoSpin();
      const delta = Math.sign(e.deltaY);
      this.targetOffset += delta;

      // Skip the double-space gap if target lands on it
      const mod = ((this.targetOffset % this.cycleLength) + this.cycleLength) % this.cycleLength;
      if (mod === this.itemCount) {
        this.targetOffset += delta;
      }

      this.startAnimation();
    }, { passive: false });

    // 2. Direct Pointer / Touch Drag
    let isDragging = false;
    this.hasDragged = false;
    let startY = 0;
    let startOffset = 0;

    this.container.addEventListener('pointerdown', (e) => {
      isDragging = true;
      this.hasDragged = false;
      startY = e.clientY;
      startOffset = this.currentOffset;
      this.stopAutoSpin();
      if (this.animId) cancelAnimationFrame(this.animId);
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 6) {
        this.hasDragged = true;
      }
      const deltaOffset = -dy / 42;
      this.currentOffset = startOffset + deltaOffset;
      this.wrapOffset();
      this.update();
    });

    window.addEventListener('pointerup', () => {
      if (!isDragging) return;
      isDragging = false;
      this.snapToNearest();
      setTimeout(() => {
        this.hasDragged = false;
      }, 60);
    });

    // 3. Local container pointer tracking for auto-rotation
    this.container.addEventListener('pointermove', (e) => {
      if (!isDragging) {
        this.handlePointerProximity(e.clientX, e.clientY);
      }
    });

    this.container.addEventListener('pointerleave', () => {
      if (!isDragging) {
        this.stopAutoSpin();
      }
    });
  }

  /**
   * Requirement 1 & 3: Auto-rotation with speed increasing near screen border
   */
  handlePointerProximity(x, y) {
    const isLeft = (this.side === 'left');
    const widthInfluence = 580; // Full interactive zone of the wheel

    // Check if cursor is within horizontal zone of this wheel dock
    const inHorizontalZone = isLeft ? (x <= widthInfluence) : (x >= window.innerWidth - widthInfluence);
    if (!inHorizontalZone) {
      this.stopAutoSpin();
      return;
    }

    const screenH = window.innerHeight;
    const centerY = screenH / 2;
    const distFromCenter = y - centerY;
    const dir = Math.sign(distFromCenter);

    // Deadzone in the center (±130px) so the user can easily hover and click active items without motion
    const deadzonePx = 130;
    const absDist = Math.abs(distFromCenter);

    if (absDist < deadzonePx) {
      this.stopAutoSpin();
      return;
    }

    // Distance from deadzone edge to top/bottom screen border (y = 0 or y = screenH)
    const maxRange = centerY - deadzonePx;
    // edgeFactor goes from 0.0 (just outside deadzone) to 1.0 (at the screen border)
    const edgeFactor = Math.min(1.0, Math.max(0.0, (absDist - deadzonePx) / maxRange));

    // Progressive acceleration:
    // Near deadzone: smooth, gentle browsing (~1.5 items/sec)
    // In proximity to screen border: fast spin (~10.5 items/sec)
    const minSpeed = 0.025;
    const maxSpeed = 0.175;
    const speed = minSpeed + Math.pow(edgeFactor, 1.4) * (maxSpeed - minSpeed);

    this.autoSpinSpeed = dir * speed;
    this.isAutoSpinning = true;
    this.startAnimation();
  }

  stopAutoSpin() {
    if (this.isAutoSpinning) {
      this.isAutoSpinning = false;
      this.autoSpinSpeed = 0;
      this.snapToNearest();
    }
  }

  snapToNearest() {
    this.wrapOffset();
    let rounded = Math.round(this.currentOffset);

    // If landed in the empty double-space gap, snap to nearest item
    const mod = ((rounded % this.cycleLength) + this.cycleLength) % this.cycleLength;
    if (mod === this.itemCount) {
      const curMod = ((this.currentOffset % this.cycleLength) + this.cycleLength) % this.cycleLength;
      rounded = (curMod >= this.itemCount - 0.5 + 1) ? (rounded + 1) : (rounded - 1);
    }

    this.targetOffset = rounded;
    this.startAnimation();
  }

  /**
   * Requirement 2: Selection depends strictly on clicked button, NOT center position.
   */
  selectValue(val, targetBasePos) {
    if (!val) return;
    this.activeValue = val;

    // Toggle active class on all perpetual button instances
    this.allButtons.forEach((b) => {
      b.classList.toggle('is-active', b._value === val);
    });

    // Notify listeners (layout or filter changed)
    this.onSelect(val);

    // Smoothly center the clicked button or closest instance
    if (targetBasePos !== undefined && targetBasePos !== null) {
      this.targetOffset = targetBasePos;
    } else {
      let bestPos = null;
      let minDiff = Infinity;
      this.allButtons.forEach((b) => {
        if (b._value === val) {
          const diff = Math.abs(b._basePos - this.currentOffset);
          if (diff < minDiff) {
            minDiff = diff;
            bestPos = b._basePos;
          }
        }
      });
      if (bestPos !== null) {
        this.targetOffset = bestPos;
      }
    }

    this.startAnimation();
  }

  setActiveByValue(val) {
    if (!val || val === this.activeValue) return;
    this.activeValue = val;

    this.allButtons.forEach((b) => {
      b.classList.toggle('is-active', b._value === val);
    });

    let bestPos = null;
    let minDiff = Infinity;
    this.allButtons.forEach((btn) => {
      if (btn._value === val) {
        const diff = Math.abs(btn._basePos - this.currentOffset);
        if (diff < minDiff) {
          minDiff = diff;
          bestPos = btn._basePos;
        }
      }
    });

    if (bestPos !== null) {
      this.stopAutoSpin();
      this.targetOffset = bestPos;
      this.startAnimation();
    }
  }

  startAnimation() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const step = () => {
      // 1. Auto-spin continuous rotation if active
      if (this.isAutoSpinning) {
        this.currentOffset += this.autoSpinSpeed;
        this.targetOffset = this.currentOffset;
        this.wrapOffset();
        this.update();
        this.animId = requestAnimationFrame(step);
        return;
      }

      // 2. Spring lerp snapping towards targetOffset
      const diff = this.targetOffset - this.currentOffset;
      if (Math.abs(diff) > 0.003) {
        this.currentOffset += diff * 0.16;
        this.wrapOffset();
        this.update();
        this.animId = requestAnimationFrame(step);
      } else {
        this.currentOffset = this.targetOffset;
        this.wrapOffset();
        this.update();
        this.animId = null;
      }
    };

    this.animId = requestAnimationFrame(step);
  }

  /**
   * Keeps currentOffset & targetOffset seamlessly within [0, cycleLength)
   */
  wrapOffset() {
    const L = this.cycleLength;
    while (this.currentOffset >= L) {
      this.currentOffset -= L;
      this.targetOffset -= L;
    }
    while (this.currentOffset < 0) {
      this.currentOffset += L;
      this.targetOffset += L;
    }
  }

  update() {
    const isLeft = (this.side === 'left');
    const R = this.pivotRadius + this.edgeMargin;

    this.allButtons.forEach((btn) => {
      // Angular slot position relative to the animated offset
      const relIdx = btn._basePos - this.currentOffset;
      const angle = relIdx * this.angleStep; // in radians
      const dist = Math.abs(relIdx);

      // Visibility cutoff beyond visible horizon
      if (dist > 6.5) {
        btn.style.visibility = 'hidden';
        btn.style.opacity = '0';
        return;
      }

      // True Radial Wheel Geometry (Ray starting at screen edge from external hub)
      const posX = R * Math.cos(angle) - this.pivotRadius;
      const posY = R * Math.sin(angle);

      // Orientation angle of the radial ray
      const rotDeg = isLeft ? (angle * 180 / Math.PI) : (-angle * 180 / Math.PI);
      const finalX = isLeft ? posX : -posX;

      // Opacity falloff: active item stays prominent even away from center
      btn.style.visibility = 'visible';
      const isSelected = (btn._value === this.activeValue);
      const baseOpacity = Math.max(0.04, 0.45 * Math.pow(0.72, dist));
      const opacity = isSelected ? Math.max(0.85, baseOpacity) : baseOpacity;
      const scale = Math.max(0.90, 1.0 - dist * 0.025);

      btn.style.transform = `translate3d(${finalX.toFixed(1)}px, ${posY.toFixed(1)}px, 0) rotate(${rotDeg.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      btn.style.opacity = opacity.toFixed(2);
    });

    // NOTE: Selection does NOT change automatically based on center position!
    // It depends strictly on which button was clicked (Requirement 2).
  }
}

/**
 * Helper to initialise a 2D perpetual radial wheel menu
 */
export function initWheelMenu(options) {
  return new WheelMenu2D(options);
}
