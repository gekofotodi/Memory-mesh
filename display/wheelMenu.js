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
    if (count <= 1) return;

    const centerIdx = (count - 1) / 2;
    // Raggio e distanza coerenti al 100% su entrambi i lati
    const pivotRadius = 420;
    const edgeMargin = 28;
    const R = pivotRadius + edgeMargin;
    // Passo angolare unificato (voci avvicinate del 40%: passo s ~36.7px)
    const angleStepRad = 0.082;

    this.buttons.forEach((btn, index) => {
      const rel = index - centerIdx;
      const theta = rel * angleStepRad;

      // Coordinate del punto sulla circonferenza da cui origina la voce
      const posX = R * Math.cos(theta) - pivotRadius;
      const posY = R * Math.sin(theta);

      // A sinistra: X verso l'interno dello schermo è positiva (+posX)
      // A destra: X verso l'interno dello schermo è negativa (-posX) rispetto a right: 0
      const finalX = isLeft ? posX : -posX;

      // Orientamento angolare del raggio lungo la direttrice dal centro:
      // A sinistra: theta (in alto verso l'alto-destra, in basso verso il basso-destra)
      // A destra: -theta (in alto verso il basso-destra, in basso verso l'alto-destra, come nella reference)
      const rotDeg = (isLeft ? 1 : -1) * (theta * 180 / Math.PI);

      btn.style.transform = `translate3d(${finalX.toFixed(1)}px, ${posY.toFixed(1)}px, 0) rotate(${rotDeg.toFixed(2)}deg)`;
    });
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
    this.buttons.forEach((btn) => {
      const isSelected = (btn.getAttribute(this.valueAttr) === this.activeValue);
      btn.classList.toggle('is-active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
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
