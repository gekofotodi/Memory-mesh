/**
 * Wheel Menu Module — Static Radial Semicircle Side Menus (/display)
 *
 * Requirements:
 *  1. Disposizione a raggi che fuoriescono dal centro di un cerchio (radial spokes).
 *  2. Font rimpicciolito del 40% (1.32rem) e voci avvicinate del 40% (pitch ~36.7px).
 *  3. Distanza dal lato dello schermo, grandezza font e distanza tra le voci coerenti al 100% tra destra e sinistra.
 *  4. Voci fisse sul proprio raggio (non si spostano al centro, diventano solo in grassetto).
 *  5. Cerchio indicatore rosso (#99251C), senza gradiente o glow.
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

    // Linee indicatrici a bordo schermo (una per voce, stessa inclinazione)
    this.ticksEl = document.createElement('div');
    this.ticksEl.className = `wheel-ticks wheel-ticks--${side}`;
    this.ticksEl.setAttribute('aria-hidden', 'true');
    container.insertAdjacentElement('afterend', this.ticksEl);

    // Vincolo diretto alle voci statiche presenti nell'HTML (nessuna duplicazione)
    this.buttons = Array.from(container.querySelectorAll(itemsSelector));
    if (this.buttons.length === 0) return;

    // Disposizione radiale a raggi coerente e unificata tra destra e sinistra
    this.setupSemicircleLayout();

    // Trova la voce attiva iniziale
    const initialActive = this.buttons.find((btn) => btn.classList.contains('is-active')) || this.buttons[0];
    this.activeValue = initialActive ? initialActive.getAttribute(this.valueAttr) : null;

    this.bindEvents();
    this.updateClasses();
  }

  /**
   * Aggiorna dinamicamente le voci del menu
   * @param {Array<{value: string, label: string}>} items
   * @param {string|null} activeVal
   */
  setItems(items = [], activeVal = null) {
    const arc = this.container.querySelector('.wheel-arc') || this.container;
    arc.innerHTML = '';

    if (!items || items.length === 0) {
      this.buttons = [];
      this.ticksEl.innerHTML = '';
      this.activeValue = null;
      this.container.classList.add('is-hidden');
      return;
    }

    this.container.classList.remove('is-hidden');

    this.buttons = items.map((it) => {
      const btn = document.createElement('button');
      btn.className = 'wheel-btn';
      btn.setAttribute(this.valueAttr, it.value);
      btn.setAttribute('aria-label', it.label);
      btn.innerHTML = `<span class="wheel-dot"></span><span class="wheel-btn__text">${it.label}</span>`;
      arc.appendChild(btn);
      return btn;
    });

    this.setupSemicircleLayout();
    this.bindEvents();

    const targetVal = activeVal || (items[0] && items[0].value);
    if (targetVal) {
      this.activeValue = targetVal;
      this.updateClasses();
    }
  }

  /**
   * Calcola e fissa la disposizione a raggi (radial spokes) che fuoriescono
   * dal centro di un cerchio. Parametri unificati per garantire coerenza totale
   * tra lato sinistro e destro:
   * - pivotRadius identico (420px)
   * - edgeMargin identico (28px dal bordo)
   * - angleStepRad identico (0.082 rad, avvicinato del 40% con passo ~36.7px)
   */
  setupSemicircleLayout() {
    const isLeft = (this.side === 'left');
    const count = this.buttons.length;
    if (count === 0) return;

    const pivotRadius = 420;
    const edgeMargin = 28;
    const R = pivotRadius + edgeMargin;

    const poses = [];
    if (count === 1) {
      const btn = this.buttons[0];
      const finalX = isLeft ? edgeMargin : -edgeMargin;
      btn.style.transform = `translate3d(${finalX.toFixed(1)}px, 0px, 0) rotate(0deg)`;
      this.renderTicks([{ x: edgeMargin, y: 0, rot: 0 }], edgeMargin);
      return;
    }

    const centerIdx = (count - 1) / 2;
    // Passo angolare unificato (voci ravvicinate con passo coerente)
    // Se ci sono molte voci (es. 10 tag), riduciamo leggermente il passo per mantenerle leggibili
    const angleStepRad = count > 7 ? 0.065 : 0.082;

    this.buttons.forEach((btn, index) => {
      const rel = index - centerIdx;
      const theta = rel * angleStepRad;

      // Coordinate del punto sulla circonferenza da cui origina la voce
      const posX = R * Math.cos(theta) - pivotRadius;
      const posY = R * Math.sin(theta);

      // A sinistra: X verso l'interno dello schermo è positiva (+posX)
      // A destra: X verso l'interno dello schermo è negativa (-posX) rispetto a right: 0
      const finalX = isLeft ? posX : -posX;

      // Orientamento angolare del raggio lungo la direttrice dal centro
      const rotDeg = (isLeft ? 1 : -1) * (theta * 180 / Math.PI);

      btn.style.transform = `translate3d(${finalX.toFixed(1)}px, ${posY.toFixed(1)}px, 0) rotate(${rotDeg.toFixed(2)}deg)`;
      poses.push({ x: posX, y: posY, rot: rotDeg });
    });
    this.renderTicks(poses, edgeMargin);
  }

  /**
   * Linee a bordo schermo: stessa posizione verticale e inclinazione delle voci,
   * spostate verso il bordo così restano visibili anche a menu chiuso.
   */
  renderTicks(poses, edgeMargin) {
    const isLeft = (this.side === 'left');
    const inset = 14; // distanza dal bordo dello schermo
    this.ticks = poses.map((p) => {
      const tick = document.createElement('span');
      tick.className = 'wheel-tick';
      const x = p.x - edgeMargin + inset;
      tick.style.transform = `translate3d(${(isLeft ? x : -x).toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.rot.toFixed(2)}deg)`;
      return tick;
    });
    this.ticksEl.replaceChildren(...this.ticks);
  }

  bindEvents() {
    this.buttons.forEach((btn) => {
      const val = btn.getAttribute(this.valueAttr);
      btn._value = val;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectValue(val);
      });
    });
  }

  /**
   * Selezione di una voce: la voce rimane fissa sul suo raggio, diventa in grassetto
   * con il pallino rosso, e notifica il listener. Nessun movimento verso il centro.
   * @param {string} val
   */
  selectValue(val) {
    if (!val) return;
    this.activeValue = val;
    this.updateClasses();
    this.onSelect(val);
  }

  /**
   * Sincronizzazione esterna dello stato attivo
   * @param {string} val
   */
  setActiveByValue(val) {
    if (!val || val === this.activeValue) return;
    this.activeValue = val;
    this.updateClasses();
  }

  updateClasses() {
    let activeIdx = -1;
    this.buttons.forEach((btn, i) => {
      const isSelected = (btn.getAttribute(this.valueAttr) === this.activeValue);
      if (isSelected) activeIdx = i;
      btn.classList.toggle('is-active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
    (this.ticks || []).forEach((tick, i) => {
      tick.classList.toggle('is-active', i === activeIdx);
      tick.classList.toggle('is-near', activeIdx >= 0 && Math.abs(i - activeIdx) === 1);
    });
  }

  // Metodi no-op per retrocompatibilità sicura
  stopAutoSpin() {}
  handlePointerProximity() {}
  update() {}
}

/**
 * Inizializza il menu laterale a raggi radiali
 */
export function initWheelMenu(options) {
  return new WheelMenu2D(options);
}
