/**
 * Wheel Menu 2D Module — Semicircle Radial Selector
 *
 * Requirements:
 *  - 2D semicircle arc along screen borders (left & right)
 *  - Clean typography in black (#000000) using Helvetica
 *  - No container or background pill around items or active selection
 *  - Active item: full opacity (1.0), bold font, solid green dot (#00E676)
 *  - Inactive items: progressive opacity falloff along the 2D arc
 *  - Interactive: Click / Pinch direct selection, mouse wheel scrolling with snap
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

    this.buttons = Array.from(container.querySelectorAll(itemsSelector));
    this.itemCount = this.buttons.length;
    if (this.itemCount === 0) return;

    // Angle step between consecutive items along the arc (in radians)
    this.angleStep = 0.32; // ~18.3 degrees per item
    this.arcRadius = 80;    // Horizontal arc protrusion in px
    this.verticalSpacing = 42; // Vertical pitch in px

    this.currentIndex = 0;
    this.targetOffset = 0;
    this.currentOffset = 0;
    this.animId = null;

    // Find initial active index
    const activeIdx = this.buttons.findIndex((b) => b.classList.contains('is-active'));
    if (activeIdx !== -1) {
      this.currentIndex = activeIdx;
      this.targetOffset = activeIdx;
      this.currentOffset = activeIdx;
    }

    this.bindEvents();
    this.update();
  }

  bindEvents() {
    // 1. Direct click on any button
    this.buttons.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectIndex(index);
      });
    });

    // 2. Mouse Wheel scroll along the arc
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const nextIdx = Math.min(this.itemCount - 1, Math.max(0, Math.round(this.targetOffset + delta)));
      this.selectIndex(nextIdx);
    }, { passive: false });
  }

  selectIndex(index) {
    if (index < 0 || index >= this.itemCount) return;
    this.currentIndex = index;
    this.targetOffset = index;

    const val = this.buttons[index].getAttribute(this.valueAttr);
    this.onSelect(val);
    this.startAnimation();
  }

  setActiveByValue(val) {
    const idx = this.buttons.findIndex((b) => b.getAttribute(this.valueAttr) === val);
    if (idx !== -1 && idx !== this.currentIndex) {
      this.currentIndex = idx;
      this.targetOffset = idx;
      this.startAnimation();
    }
  }

  startAnimation() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const step = () => {
      const diff = this.targetOffset - this.currentOffset;
      if (Math.abs(diff) > 0.005) {
        this.currentOffset += diff * 0.16; // smooth spring lerp
        this.update();
        this.animId = requestAnimationFrame(step);
      } else {
        this.currentOffset = this.targetOffset;
        this.update();
        this.animId = null;
      }
    };

    this.animId = requestAnimationFrame(step);
  }

  update() {
    const isLeft = (this.side === 'left');

    this.buttons.forEach((btn, index) => {
      // Distance from current animated center
      const relIdx = index - this.currentOffset;
      const angle = relIdx * this.angleStep;

      // 2D Semicircle positioning
      // At center (angle = 0): maximum protrusion into screen
      // At extremes: curves back towards the screen edge
      const curveFactor = Math.max(0, Math.cos(angle));
      const protrusionX = curveFactor * this.arcRadius;
      const posX = isLeft ? protrusionX : -protrusionX;
      const posY = relIdx * this.verticalSpacing;

      // Gentle 2D radial rotation tangent to the arc (matches editorial reference)
      const rotAngle = (isLeft ? -1 : 1) * relIdx * 7.5; // in degrees

      // Opacity and scale falloff along the arc (pure black text fading softly)
      const opacity = Math.max(0.12, Math.pow(Math.cos(Math.min(Math.PI / 2, Math.abs(angle))), 2.2));
      const scale = Math.max(0.88, 0.88 + curveFactor * 0.12);

      const isActive = (index === this.currentIndex);
      btn.classList.toggle('is-active', isActive);

      // Apply 2D transform and opacity
      btn.style.transform = `translate3d(${posX.toFixed(1)}px, ${posY.toFixed(1)}px, 0) rotate(${rotAngle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      btn.style.opacity = isActive ? '1' : opacity.toFixed(2);
    });
  }
}

/**
 * Helper to initialise a 2D wheel menu
 */
export function initWheelMenu(options) {
  return new WheelMenu2D(options);
}
