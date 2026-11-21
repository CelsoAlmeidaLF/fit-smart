/**
 * Componente BottomSheet Modal Canônico
 */
export class BottomSheet {
  constructor(scrimEl, sheetEl) {
    this._scrim = scrimEl || document.querySelector('#scrim');
    this._sheet = sheetEl || document.querySelector('#sheet');
    this._inEl = this._sheet ? (this._sheet.querySelector('#shBody') || this._sheet.querySelector('#shIn')) : null;
    this._closeBtn = this._sheet ? (this._sheet.querySelector('#shX') || this._sheet.querySelector('.grab')) : null;

    if (this._scrim) {
      this._scrim.onclick = () => this.close();
    }
    if (this._closeBtn) {
      this._closeBtn.onclick = () => this.close();
    }
  }

  open(htmlContent) {
    if (!this._sheet) return;
    if (this._inEl) {
      this._inEl.innerHTML = htmlContent;
    }
    if (this._scrim) {
      this._scrim.hidden = false;
      this._scrim.classList.add('on');
    }
    this._sheet.hidden = false;
    this._sheet.classList.add('on');
    document.body.classList.add('noscroll');
  }

  close() {
    if (this._scrim) {
      this._scrim.classList.remove('on');
      setTimeout(() => { if (!this.isOpen()) this._scrim.hidden = true; }, 300);
    }
    if (this._sheet) {
      this._sheet.classList.remove('on');
      setTimeout(() => { if (!this.isOpen()) this._sheet.hidden = true; }, 400);
    }
    document.body.classList.remove('noscroll');
  }

  isOpen() {
    return this._sheet && this._sheet.classList.contains('on');
  }
}
