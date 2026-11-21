import { APPIC } from '../assets/AppIcon.js';

/**
 * Componente Visual de Teclado Numérico Seguro (PIN Pad)
 */
export class PinPad {
  static activePad = null;
  static _listenerRegistered = false;

  static initGlobalKeyboardListener() {
    if (this._listenerRegistered) return;
    document.addEventListener('keydown', e => {
      if (!this.activePad || !document.body.contains(this.activePad) || this.activePad.offsetParent === null) {
        return;
      }
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (this.activePad._key) {
        this.activePad._key(e);
      }
    });
    this._listenerRegistered = true;
  }

  static render(containerEl, options = {}) {
    this.initGlobalKeyboardListener();
    let v = '';
    let busy = false;

    containerEl.innerHTML = `
      <div class="pp">
        ${options.logo === false ? '' : `<img class="appic sm" src="${APPIC}" alt="">`}
        <h3 class="pp-t">${options.title || 'PIN'}</h3>
        <p class="pp-s">${options.sub || ''}</p>
        <div class="pp-d">${'<i></i>'.repeat(6)}</div>
        <div class="pp-e" role="alert"></div>
        <div class="pp-k">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map(n => `<button type="button" data-k="${n}">${n}</button>`)
            .join('')}
          ${
            options.bio
              ? '<button type="button" data-k="bio" class="fx" aria-label="Usar biometria"><span class="ms" aria-hidden="true">fingerprint</span></button>'
              : '<span></span>'
          }
          <button type="button" data-k="0">0</button>
          <button type="button" data-k="del" class="fx" aria-label="Apagar"><span class="ms" aria-hidden="true">backspace</span></button>
        </div>
        ${options.mode === 'create' ? '<button type="button" class="btn pri pp-ok" disabled>Continuar</button>' : ''}
        ${options.foot || ''}
      </div>
    `;

    const dots = [...containerEl.querySelectorAll('.pp-d i')];
    const err = containerEl.querySelector('.pp-e');
    const ok = containerEl.querySelector('.pp-ok');
    const dotBox = containerEl.querySelector('.pp-d');

    const draw = () => {
      dots.forEach((d, i) => {
        d.className = i < v.length ? 'on' : '';
        d.style.display =
          (options.len && i >= options.len) || (!options.len && options.mode === 'verify' && i >= Math.max(4, v.length))
            ? 'none'
            : '';
      });
      if (ok) ok.disabled = v.length < 4;
    };

    const fail = m => {
      err.textContent = m;
      dotBox.classList.remove('shk');
      void dotBox.offsetWidth;
      dotBox.classList.add('shk');
      try {
        if (navigator.vibrate) navigator.vibrate(90);
      } catch (e) {}
      v = '';
      draw();
    };

    const press = async k => {
      if (busy) return;
      if (k === 'bio') {
        if (options.onBio) options.onBio();
        return;
      }
      if (k === 'del') {
        v = v.slice(0, -1);
        err.textContent = '';
        draw();
        return;
      }
      if (v.length >= 6) return;
      v += k;
      err.textContent = '';
      draw();

      if (options.mode === 'verify' && v.length >= 4) {
        busy = true;
        const result = await options.check(v);
        busy = false;
        if (result) {
          options.onOk(v);
          return;
        }
        if (v.length >= (options.len || 6)) {
          fail(options.err || 'PIN incorreto. Tente de novo.');
        }
      }
    };

    containerEl.querySelector('.pp-k').onclick = e => {
      const btn = e.target.closest('[data-k]');
      if (btn) press(btn.dataset.k);
    };

    if (ok) {
      ok.onclick = () => {
        if (v.length >= 4) options.onOk(v);
      };
    }

    containerEl._key = e => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter' && ok && !ok.disabled) ok.click();
    };

    this.activePad = containerEl;
    draw();
    return { fail };
  }

  static renderCreationFlow(containerEl, options = {}) {
    const startStepOne = msg => {
      this.render(containerEl, {
        mode: 'create',
        title: options.title || 'Crie seu PIN',
        sub: options.sub || 'Escolha de 4 a 6 números.',
        logo: options.logo,
        foot: options.foot,
        onOk: p1 => {
          this.render(containerEl, {
            mode: 'verify',
            len: p1.length,
            title: 'Confirme o PIN',
            sub: 'Digite o mesmo PIN novamente.',
            logo: options.logo,
            err: 'Os PINs não conferem.',
            check: async v => v === p1,
            onOk: () => options.onDone(p1),
            foot: '<button type="button" class="link pp-back">Voltar</button>'
          });
          const backBtn = containerEl.querySelector('.pp-back');
          if (backBtn) backBtn.onclick = () => startStepOne();
        }
      });
      if (options.bindFoot) options.bindFoot(containerEl);
      if (msg) containerEl.querySelector('.pp-e').textContent = msg;
    };
    startStepOne();
  }

  static clearActive() {
    this.activePad = null;
  }
}
