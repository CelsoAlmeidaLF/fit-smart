/**
 * Componente Toast Canônico
 */
export class Toast {
  constructor(toastEl) {
    this._el = toastEl || document.querySelector('#toast');
    this._txtEl = this._el ? this._el.querySelector('#tTxt') : null;
    this._undoBtn = this._el ? this._el.querySelector('#tUndo') : null;
    this._timeout = null;
    this._undoHandler = null;

    if (this._undoBtn) {
      this._undoBtn.onclick = () => {
        if (this._undoHandler) {
          this._undoHandler();
          this._undoHandler = null;
        }
        this.hide();
      };
    }
  }

  show(message, undoFn = null) {
    if (!this._el) return;
    if (this._txtEl) this._txtEl.textContent = message;
    this._undoHandler = undoFn;

    if (this._undoBtn) {
      this._undoBtn.style.display = undoFn ? '' : 'none';
    }

    this._el.classList.add('on');
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => this.hide(), undoFn ? 5000 : 2200);
  }

  hide() {
    if (this._el) {
      this._el.classList.remove('on');
    }
  }
}
