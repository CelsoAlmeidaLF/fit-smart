import { FormatUtils } from '../../domain/utils/FormatUtils.js';
import { BmrTdeeCalculatorModel } from '../../domain/models/BmrTdeeCalculatorModel.js';
import { HydrationModel } from '../../domain/models/HydrationModel.js';
import { BODY } from '../../domain/catalogs/BodyDiagramCatalog.js';
import { GRUPOS, EXS, CARD } from '../../domain/catalogs/WorkoutCatalog.js';
import { BiometricsAdapter } from '../../infrastructure/security/BiometricsAdapter.js';
import { WebAudioAdapter } from '../../infrastructure/audio/WebAudioAdapter.js';
import { PinPad } from '../components/PinPad.js';
import { APPIC } from '../assets/AppIcon.js';
import { SecurityRecoveryService } from '../../infrastructure/security/SecurityRecoveryService.js';

/**
 * Controller Central da Interface de Fit Smart (MVC / Presentation Layer)
 * Coordena navegação, renderização reativa, onboarding, sheets e autenticação
 */
export class AppController {
  constructor({ storageAdapter, healthService, workoutDietService, bottomSheet, toast }) {
    this._storage = storageAdapter;
    this._health = healthService;
    this._workout = workoutDietService;
    this._sheet = bottomSheet;
    this._toast = toast;

    this._state = this._storage.loadState();
    this._today = FormatUtils.getTodayIso();
    this._views = ['inicio', 'peso', 'diario', 'cad', 'card', 'treino', 'config'];
    this._mapV = 'front';
    this._mapSel = '';
    this._mapF = '';
    this._restInterval = null;
    this._restEnd = 0;
  }

  init() {
    this._bindGlobalEvents();
    this.setThemeMode(this._state.mode || 'auto');
    this.renderAll();
    this.handleRoute();

    if (!this._state.onb) {
      this.startOnboarding();
    } else {
      this.checkAppLock();
    }
  }

  getState() {
    return this._state;
  }

  save() {
    this._storage.saveState(this._state);
  }

  renderAll() {
    setTimeout(() => this.syncSegmentedControls(), 0);
    setTimeout(() => this.renderBiometricsSwitch(), 0);
    this.renderSaude();
    this.renderMarcosSafe();
    this.renderMapa();
    this.renderInicio();
    this.renderBars();
    this.renderEvo();
    this.renderPeso();
    this.renderDiario();
    this.renderCad();
    this.renderCard();
    this.renderTreino();
    this.renderPlano();
    this.renderPerfil();
  }

  _bindGlobalEvents() {
    window.addEventListener('hashchange', () => this.handleRoute());

    // Abas de navegação
    document.querySelectorAll('nav a[data-v]').forEach(a => {
      a.addEventListener('click', e => {
        const v = a.dataset.v;
        if (v) window.location.hash = v;
      });
    });

    // Theme toggle
    const themeBtn = document.querySelector('#bTheme');
    if (themeBtn) {
      themeBtn.onclick = () => {
        const next = this._state.mode === 'dark' ? 'light' : 'dark';
        this.setThemeMode(next);
      };
    }

    // Lock button
    const lockBtn = document.querySelector('#bLock');
    if (lockBtn) {
      lockBtn.onclick = () => this.lockApp();
    }

    // Privacy button
    const privBtn = document.querySelector('#bPriv');
    if (privBtn) {
      privBtn.onclick = () => this.showPrivacySheet();
    }

    // Change PIN button
    const pinBtn = document.querySelector('#bPin');
    if (pinBtn) {
      pinBtn.onclick = () => this.showChangePinSheet();
    }

    // Certificado PDF button
    const certBtn = document.querySelector('#bCert');
    if (certBtn) {
      certBtn.onclick = async () => {
        await this.ensureSeed();
        try {
          await SecurityRecoveryService.downloadSecurityCertificate({
            appName: 'Fit Systekna',
            words: this._state.seedWords,
            hash: this._state.seedHash
          });
          this._toast.show('Certificado de Segurança baixado.');
        } catch (e) {
          this._toast.show('Erro ao emitir PDF: ' + e.message);
        }
      };
    }

    // View Words button
    const wordsBtn = document.querySelector('#bWords');
    if (wordsBtn) {
      wordsBtn.onclick = async () => {
        await this.ensureSeed();
        if (this._state.pin) {
          this._sheet.open(`
            <h3 style="margin-top:0">Confirmação de Segurança</h3>
            <p style="color:var(--soft);font-size:13px">Digite seu PIN para visualizar suas 12 palavras de recuperação:</p>
            <div id="pinBoxAuthSmart"></div>
          `);
          const box = document.querySelector('#pinBoxAuthSmart');
          if (box) {
            PinPad.render(box, {
              mode: 'verify',
              title: 'Confirmar PIN',
              sub: 'Apenas você deve visualizar este segredo.',
              len: this._state.pinLen,
              check: async v => {
                const h = await BiometricsAdapter.hashPin(v);
                return h === this._state.pin;
              },
              onOk: () => this.displayWordsModal(false)
            });
          }
        } else {
          this.displayWordsModal(false);
        }
      };
    }

    // Biometrics switch
    document.addEventListener('change', async e => {
      if (e.target.id !== 'fBio') return;
      const sw = e.target;
      if (sw.checked) {
        try {
          const cred = await BiometricsAdapter.registerCredential();
          this._state.bio = cred;
          this.save();
          this._toast.show('Biometria ativada');
        } catch (err) {
          sw.checked = false;
          this._toast.show('Não foi possível ativar a biometria');
        }
      } else {
        delete this._state.bio;
        this.save();
        this._toast.show('Biometria desativada');
      }
    });

    // Resize Observers para Gráficos
    const fig = document.querySelector('#fig');
    if (fig && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.drawWeightChart()).observe(fig);
    }
    const tEvo = document.querySelector('#tEvo');
    if (tEvo && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.drawEvoChart()).observe(tEvo);
    }
    const vPeso = document.querySelector('#v-peso');
    if (vPeso && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.drawSaudeRadar()).observe(vPeso);
    }

    // Configura botões de adicionar rápidos
    const addPesoBtn = document.querySelector('#bAddP');
    if (addPesoBtn) addPesoBtn.onclick = () => this.showAddWeightSheet();
    const addRefBtn = document.querySelector('#bAddRef');
    if (addRefBtn) addRefBtn.onclick = () => this.showAddFoodSheet();
    const addTrBtn = document.querySelector('#bAddTr');
    if (addTrBtn) addTrBtn.onclick = () => this.showAddWorkoutSheet();

    // Exportar / Importar
    const bExp = document.querySelector('#bExp');
    if (bExp) {
      bExp.onclick = () => this.exportJsonBackup();
    }
    const fImp = document.querySelector('#fImp');
    if (fImp) {
      fImp.onchange = ev => this.importJsonBackup(ev);
    }
    const bWipe = document.querySelector('#bWipe');
    if (bWipe) {
      bWipe.onclick = () => this.confirmWipeAllData();
    }
  }

  handleRoute() {
    let h = location.hash.slice(1);
    if (h === 'perfil') h = 'config';
    const v = this._views.includes(h)
      ? h
      : this._state.home && this._views.includes(this._state.home)
      ? this._state.home
      : 'inicio';

    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const viewEl = document.querySelector('#v-' + v);
    if (viewEl) viewEl.classList.add('active');

    document.querySelectorAll('nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.v === v);
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
    if (v === 'peso') {
      setTimeout(() => this.drawWeightChart(), 60);
      setTimeout(() => this.drawSaudeRadar(), 60);
    }
    if (v === 'inicio') {
      setTimeout(() => this.drawEvoChart(), 60);
    }
  }

  setThemeMode(mode) {
    this._state.mode = mode;
    this.save();
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
    const bTheme = document.querySelector('#bTheme');
    if (bTheme) {
      bTheme.querySelector('.lbl').textContent = mode === 'dark' ? 'Modo claro' : 'Modo escuro';
    }
  }

  syncSegmentedControls() {
    document.querySelectorAll('.segc,.tabs').forEach(g => {
      const h = document.getElementById(g.dataset.for);
      if (!h) return;
      g.querySelectorAll('button[data-v]').forEach(b => {
        b.setAttribute('aria-pressed', b.dataset.v === h.value);
      });
    });
  }

  // --- RENDERS DAS SEÇÕES ---

  renderInicio() {
    const energy = this._workout.getDailyEnergyBalance(this._today);
    const leftEl = document.querySelector('#cLeft');
    if (leftEl) leftEl.textContent = FormatUtils.formatNumber(energy.remainingKcal);
    const metaEl = document.querySelector('#cMeta');
    if (metaEl) metaEl.textContent = FormatUtils.formatNumber(energy.targetKcal);
    const inEl = document.querySelector('#cIn');
    if (inEl) inEl.textContent = FormatUtils.formatNumber(energy.consumedKcal);
    const outEl = document.querySelector('#cOut');
    if (outEl) outEl.textContent = FormatUtils.formatNumber(energy.burnedKcal);

    // Água
    const waterGlasses = this._workout.getHydrationGlasses(this._today);
    const targetGlasses = (this._state.perfil && this._state.perfil.agua) || 8;
    const waterVol = HydrationModel.calculateVolumeMl(waterGlasses);
    const waterProg = HydrationModel.calculateProgressPercent(waterGlasses, targetGlasses);

    const wMl = document.querySelector('#wMl');
    if (wMl) wMl.textContent = `${FormatUtils.formatNumber(waterVol)} ml`;
    const wProg = document.querySelector('#wProg');
    if (wProg) wProg.style.width = `${waterProg}%`;
    const wCops = document.querySelector('#wCops');
    if (wCops) wCops.textContent = `${waterGlasses}/${targetGlasses}`;

    const bWMinus = document.querySelector('#bWMinus');
    if (bWMinus) {
      bWMinus.onclick = () => {
        this._workout.setHydrationGlasses(Math.max(0, waterGlasses - 1), this._today);
        this.renderInicio();
      };
    }
    const bWPlus = document.querySelector('#bWPlus');
    if (bWPlus) {
      bWPlus.onclick = () => {
        this._workout.setHydrationGlasses(waterGlasses + 1, this._today);
        this.renderInicio();
      };
    }
  }

  renderBars() {
    const energy = this._workout.getDailyEnergyBalance(this._today);
    const barEl = document.querySelector('#bConsumo');
    if (barEl) {
      const pct = Math.min(100, Math.round((energy.consumedKcal / (energy.targetKcal || 1)) * 100));
      barEl.style.width = `${pct}%`;
    }
  }

  renderEvo() {
    this.drawEvoChart();
  }

  drawEvoChart() {
    const svg = document.querySelector('#tEvo');
    if (!svg) return;
    const W = svg.clientWidth || 300;
    const H = svg.clientHeight || 120;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const weights = (this._state.pesos || []).slice(-7);
    if (weights.length < 2) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="currentColor" opacity="0.4" font-size="12">Registre mais dados para ver a evolução</text>`;
      return;
    }

    const minK = Math.min(...weights.map(w => w.kg)) - 1;
    const maxK = Math.max(...weights.map(w => w.kg)) + 1;
    const pts = weights.map((w, i) => {
      const x = (i / (weights.length - 1)) * (W - 40) + 20;
      const y = H - 20 - ((w.kg - minK) / (maxK - minK || 1)) * (H - 40);
      return [x, y];
    });

    const dPath = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p[0]},${p[1]}` : ` L ${p[0]},${p[1]}`), '');
    svg.innerHTML = `
      <path d="${dPath}" fill="none" stroke="var(--c-pri, #6FCF97)" stroke-width="2.5" stroke-linecap="round"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--c-pri, #6FCF97)"/>`).join('')}
    `;
  }

  renderPeso() {
    const currentWeight = this._workout.getCurrentWeight();
    const metaWeight = (this._state.perfil && this._state.perfil.meta) || 75;
    const initialWeight = (this._state.perfil && this._state.perfil.ini) || 80;

    const pCur = document.querySelector('#pCur');
    if (pCur) pCur.textContent = FormatUtils.formatNumber(currentWeight, 1);
    const pMeta = document.querySelector('#pMeta');
    if (pMeta) pMeta.textContent = FormatUtils.formatNumber(metaWeight, 1);
    const pIni = document.querySelector('#pIni');
    if (pIni) pIni.textContent = FormatUtils.formatNumber(initialWeight, 1);

    const summary = this._workout.getMetabolicSummary();
    const imcEl = document.querySelector('#pImc');
    if (imcEl) imcEl.textContent = `${summary.bmi} (${summary.bmiCategory})`;

    const histEl = document.querySelector('#pHist');
    if (histEl) {
      const sorted = (this._state.pesos || []).slice().reverse();
      histEl.innerHTML = sorted
        .slice(0, 10)
        .map(
          p => `
          <div class="row pad" style="justify-content:space-between;border-bottom:1px solid var(--line, rgba(255,255,255,0.08))">
            <span>${FormatUtils.formatDateBr(p.d)}</span>
            <b>${FormatUtils.formatNumber(p.kg, 1)} kg</b>
          </div>
        `
        )
        .join('');
    }
  }

  drawWeightChart() {
    const svg = document.querySelector('#fig');
    if (!svg) return;
    const W = svg.clientWidth || 320;
    const H = svg.clientHeight || 180;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const weights = this._state.pesos || [];
    if (!weights.length) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="currentColor" opacity="0.4" font-size="12">Sem dados de peso</text>`;
      return;
    }

    const minK = Math.min(...weights.map(w => w.kg)) - 1;
    const maxK = Math.max(...weights.map(w => w.kg)) + 1;
    const pts = weights.map((w, i) => {
      const x = (i / Math.max(1, weights.length - 1)) * (W - 40) + 20;
      const y = H - 25 - ((w.kg - minK) / (maxK - minK || 1)) * (H - 50);
      return [x, y];
    });

    const dPath = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p[0]},${p[1]}` : ` L ${p[0]},${p[1]}`), '');
    svg.innerHTML = `
      <path d="${dPath}" fill="none" stroke="var(--c-pri, #6FCF97)" stroke-width="2.5" stroke-linecap="round"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--c-pri, #6FCF97)"/>`).join('')}
    `;
  }

  renderSaude() {
    // Painel clínico e radar metabólico
    this.drawSaudeRadar();
  }

  drawSaudeRadar() {
    // Desenha indicadores de saúde se canvas/svg estiver presente
  }

  renderMarcosSafe() {
    try {
      this.checkMilestones();
    } catch (e) {
      console.warn('[AppController] Erro em marcos:', e);
    }
  }

  checkMilestones() {
    this._state.mkOk = this._state.mkOk || [];
    const cur = this._workout.getCurrentWeight();
    const ini = (this._state.perfil && this._state.perfil.ini) || 80;
    const meta = (this._state.perfil && this._state.perfil.meta) || 75;

    if (ini > meta) {
      const lost = ini - cur;
      if (lost >= 1 && !this._state.mkOk.includes('lost1')) {
        this._state.mkOk.push('lost1');
        this.save();
        this._toast.show('Parabéns! Primeiro quilo eliminado!');
      }
    }
  }

  renderMapa() {
    const mapaEl = document.querySelector('#bodyMap');
    if (!mapaEl || !BODY) return;
    const side = this._mapV === 'back' ? BODY.back : BODY.front;
    if (side && side.img && side.img.light) {
      mapaEl.src = side.img.light;
    }
  }

  renderDiario() {
    const dList = document.querySelector('#dList');
    if (!dList) return;

    const comidasDia = (this._state.comidas || []).filter(c => c.d === this._today);
    const treinosDia = (this._state.treinos || []).filter(t => t.d === this._today);

    if (!comidasDia.length && !treinosDia.length) {
      dList.innerHTML = '<p class="lead" style="text-align:center">Nenhum registro hoje. Use os botões abaixo para lançar.</p>';
      return;
    }

    let html = '';
    if (comidasDia.length) {
      html += '<h4 style="margin:12px 0 6px">Alimentação</h4>';
      html += comidasDia
        .map(
          c => `
        <div class="card row" style="justify-content:space-between;margin-bottom:6px">
          <div><b>${FormatUtils.escapeHtml(c.n)}</b><br><small class="t-sub">${FormatUtils.escapeHtml(c.ref || '')}</small></div>
          <b class="num">${FormatUtils.formatNumber(c.kcal)} kcal</b>
        </div>
      `
        )
        .join('');
    }

    if (treinosDia.length) {
      html += '<h4 style="margin:12px 0 6px">Atividades & Treinos</h4>';
      html += treinosDia
        .map(
          t => `
        <div class="card row" style="justify-content:space-between;margin-bottom:6px">
          <div><b>${FormatUtils.escapeHtml(t.nome)}</b><br><small class="t-sub">${t.min} min · ${FormatUtils.escapeHtml(t.tipo || '')}</small></div>
          <b class="num t-up">+${FormatUtils.formatNumber(t.kcal)} kcal</b>
        </div>
      `
        )
        .join('');
    }

    dList.innerHTML = html;
  }

  renderCad() {
    // Lista de alimentos e exercícios customizados
  }

  renderCard() {
    const cEl = document.querySelector('#cardContent');
    if (!cEl || !CARD) return;

    cEl.innerHTML = Object.entries(CARD)
      .map(
        ([cat, items]) => `
      <div class="card" style="margin-bottom:12px">
        <h4 style="margin-bottom:8px">${cat}</h4>
        ${items
          .map(
            ([item, kcal]) => `
          <div class="row" style="justify-content:space-between;padding:4px 0">
            <span>${item}</span>
            <span class="num">${kcal} kcal</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('');
  }

  renderTreino() {
    const semEl = document.querySelector('#trSemana');
    if (!semEl) return;
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const semana = this._state.semana || [];

    semEl.innerHTML = dias
      .map((d, i) => {
        const item = semana[i] || { t: 'des' };
        const label = item.t === 'des' ? 'Descanso' : item.t === 'f' ? `Ficha ${item.id}` : 'Aeróbico';
        return `
        <div class="card mini-day" style="text-align:center">
          <small>${d}</small>
          <b style="display:block;margin-top:4px">${label}</b>
        </div>
      `;
      })
      .join('');
  }

  renderPlano() {
    const summary = this._workout.getMetabolicSummary();
    const plKcal = document.querySelector('#plKcal');
    if (plKcal) plKcal.textContent = FormatUtils.formatNumber(summary.targetKcal);
    const plGasto = document.querySelector('#plGasto');
    if (plGasto) plGasto.textContent = FormatUtils.formatNumber(summary.tdee);
  }

  renderPerfil() {
    const p = this._state.perfil || {};
    const nEl = document.querySelector('#fNome');
    if (nEl) nEl.value = p.nome || '';
    const altEl = document.querySelector('#fAlt');
    if (altEl) altEl.value = p.alt || 170;
    const nascEl = document.querySelector('#fNasc');
    if (nascEl) nascEl.value = p.nasc || '';
    const iniEl = document.querySelector('#fIni');
    if (iniEl) iniEl.value = p.ini || 80;
    const metaEl = document.querySelector('#fMeta');
    if (metaEl) metaEl.value = p.meta || 75;

    const fForm = document.querySelector('#formPerfil');
    if (fForm) {
      fForm.onsubmit = e => {
        e.preventDefault();
        p.nome = nEl ? nEl.value.trim() : '';
        p.alt = altEl ? Number(altEl.value) : 170;
        p.nasc = nascEl ? nascEl.value : '';
        p.meta = metaEl ? Number(metaEl.value) : 75;
        this.save();
        this.renderAll();
        this._toast.show('Perfil atualizado com sucesso.');
      };
    }
  }

  // --- MODAL SHEETS ---

  showAddWeightSheet() {
    const cur = this._workout.getCurrentWeight();
    this._sheet.open(`
      <h3 id="shT">Registrar Peso</h3>
      <form class="form" id="frmWeight">
        <div class="f">
          <label>Peso (kg)</label>
          <input type="number" step="0.1" id="inKg" value="${cur}" required inputmode="decimal">
        </div>
        <div class="f">
          <label>Data</label>
          <input type="date" id="inD" value="${this._today}" max="${this._today}" required>
        </div>
        <button class="btn pri" style="margin-top:12px">Salvar</button>
      </form>
    `);

    const frm = document.querySelector('#frmWeight');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const kg = Number(document.querySelector('#inKg').value);
        const d = document.querySelector('#inD').value;
        if (kg > 0) {
          this._workout.addWeight(kg, d);
          this._sheet.close();
          this.renderAll();
          this._toast.show('Peso registrado com sucesso.');
        }
      };
    }
  }

  showAddFoodSheet() {
    this._sheet.open(`
      <h3 id="shT">Registrar Refeição</h3>
      <form class="form" id="frmFood">
        <div class="f">
          <label>Descrição do Alimento</label>
          <input type="text" id="inFoodN" placeholder="Ex: Arroz com frango" required>
        </div>
        <div class="two">
          <div class="f">
            <label>Calorias (kcal)</label>
            <input type="number" id="inFoodKcal" placeholder="300" required inputmode="numeric">
          </div>
          <div class="f">
            <label>Refeição</label>
            <select id="inFoodRef">
              <option value="Café da manhã">Café da manhã</option>
              <option value="Almoço" selected>Almoço</option>
              <option value="Lanche">Lanche</option>
              <option value="Jantar">Jantar</option>
            </select>
          </div>
        </div>
        <button class="btn pri" style="margin-top:12px">Adicionar ao Diário</button>
      </form>
    `);

    const frm = document.querySelector('#frmFood');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const n = document.querySelector('#inFoodN').value;
        const kcal = document.querySelector('#inFoodKcal').value;
        const ref = document.querySelector('#inFoodRef').value;
        if (n && kcal) {
          this._workout.addMeal(n, kcal, ref, this._today);
          this._sheet.close();
          this.renderAll();
          this._toast.show('Refeição adicionada.');
        }
      };
    }
  }

  showAddWorkoutSheet() {
    this._sheet.open(`
      <h3 id="shT">Registrar Treino</h3>
      <form class="form" id="frmWorkout">
        <div class="f">
          <label>Atividade</label>
          <input type="text" id="inTrN" placeholder="Ex: Corrida, Musculação" required>
        </div>
        <div class="two">
          <div class="f">
            <label>Duração (min)</label>
            <input type="number" id="inTrMin" value="45" required inputmode="numeric">
          </div>
          <div class="f">
            <label>Calorias Queimadas</label>
            <input type="number" id="inTrKcal" value="250" required inputmode="numeric">
          </div>
        </div>
        <button class="btn pri" style="margin-top:12px">Adicionar ao Diário</button>
      </form>
    `);

    const frm = document.querySelector('#frmWorkout');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const n = document.querySelector('#inTrN').value;
        const min = document.querySelector('#inTrMin').value;
        const kcal = document.querySelector('#inTrKcal').value;
        if (n && min) {
          this._workout.addWorkout(n, 'Aeróbico', min, kcal, 'run', this._today);
          this._sheet.close();
          this.renderAll();
          this._toast.show('Treino registrado.');
        }
      };
    }
  }

  async showPrivacySheet() {
    const policy = await SecurityRecoveryService.getPrivacyPolicy('Fit Systekna');
    this._sheet.open(`
      <h3 id="shT">${policy.title}</h3>
      <p style="font-size:13px;color:var(--accent);margin-bottom:14px">${policy.summary}</p>
      <div style="max-height:60vh;overflow-y:auto;padding-right:6px">
        ${policy.sections.map(s => `
          <div style="margin-bottom:12px;background:var(--surface-2, rgba(255,255,255,0.04));padding:10px 12px;border-radius:10px">
            <b style="font-size:13px;display:block;margin-bottom:4px">${s.heading}</b>
            <p style="font-size:12px;color:var(--soft);margin:0;line-height:1.4">${s.text}</p>
          </div>
        `).join('')}
      </div>
      <button class="btn pri block" id="bClosePriv" style="margin-top:14px;width:100%">Entendido</button>
    `);
    const bClose = document.querySelector('#bClosePriv');
    if (bClose) bClose.onclick = () => this._sheet.close();
  }

  async ensureSeed() {
    if (!this._state.seedWords || this._state.seedWords.length !== 12 || !this._state.seedHash) {
      const seed = await SecurityRecoveryService.generateSeed();
      this._state.seedWords = seed.words;
      this._state.seedHash = seed.hash;
      this.save();
    }
  }

  displayWordsModal(wasJustCreated = false) {
    const wordsList = this._state.seedWords || [];
    this._sheet.open(`
      <h3 style="margin-top:0">Suas 12 Palavras de Recuperação</h3>
      <p style="font-size:12px;color:var(--soft);margin-bottom:12px">Guarde estas palavras em local seguro. Elas são a única chave para recuperar o PIN se esquecido:</p>
      
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-bottom:14px;background:var(--surface-2, rgba(255,255,255,0.05));padding:12px;border-radius:10px">
        ${wordsList.map((w, idx) => `
          <div style="font-family:monospace;font-size:12px;color:var(--ink)">
            <span style="color:var(--soft)">${idx + 1}.</span> <b>${w}</b>
          </div>
        `).join('')}
      </div>

      <div style="background:var(--surface, rgba(0,0,0,0.2));padding:8px 12px;border-radius:8px;margin-bottom:14px;border:1px solid var(--line)">
        <small style="display:block;color:var(--soft);font-size:11px">Código Hash de Validação:</small>
        <code style="font-size:16px;font-weight:700;color:var(--accent);letter-spacing:1px">${this._state.seedHash || 'XXXX-XXXX-XXXX'}</code>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button type="button" class="btn pri block" id="btnDownloadCertModalSmart">Baixar Certificado em PDF (A4)</button>
        <button type="button" class="btn sec block" id="btnDoneWordsSmart">${wasJustCreated ? 'Guardei as palavras e o PIN' : 'Fechar'}</button>
      </div>
    `);

    const btnDl = document.querySelector('#btnDownloadCertModalSmart');
    if (btnDl) {
      btnDl.onclick = async () => {
        await SecurityRecoveryService.downloadSecurityCertificate({
          appName: 'Fit Systekna',
          words: this._state.seedWords,
          hash: this._state.seedHash
        });
        this._toast.show('Download do Certificado iniciado.');
      };
    }

    const btnDone = document.querySelector('#btnDoneWordsSmart');
    if (btnDone) {
      btnDone.onclick = () => {
        this._sheet.close();
        if (wasJustCreated) {
          this._toast.show('PIN e Certificado configurados com sucesso.');
        }
      };
    }
  }

  showChangePinSheet() {
    this._sheet.open(`
      <h3 id="shT">Alterar PIN de Segurança</h3>
      <div id="pinBox"></div>
      <button class="btn sec" style="margin-top:12px;width:100%" id="bClosePin">Cancelar</button>
    `);
    const bClose = document.querySelector('#bClosePin');
    if (bClose) bClose.onclick = () => this._sheet.close();

    const pinBox = document.querySelector('#pinBox');
    if (pinBox) {
      PinPad.render(pinBox, {
        mode: 'verify',
        title: 'PIN Atual',
        sub: 'Digite o PIN atual para continuar.',
        check: async v => {
          const h = await BiometricsAdapter.hashPin(v);
          return h === this._state.pin;
        },
        onOk: () => {
          PinPad.renderCreationFlow(pinBox, {
            title: 'Novo PIN',
            sub: 'Digite o novo PIN.',
            onDone: async newPin => {
              await this.ensureSeed();
              this._state.pin = await BiometricsAdapter.hashPin(newPin);
              this._state.pinLen = newPin.length;
              this.save();
              this.displayWordsModal(true);
            }
          });
        }
      });
    }
  }

  // --- SEGURANÇA E ONBOARDING ---

  async renderBiometricsSwitch() {
    const sw = document.querySelector('#fBio');
    if (!sw) return;
    sw.checked = !!this._state.bio;
    const isAvail = await BiometricsAdapter.isAvailable();
    sw.disabled = !isAvail && !this._state.bio;
    const bioTx = document.querySelector('#bioTx');
    if (bioTx) {
      bioTx.textContent = isAvail
        ? 'Digital ou reconhecimento facial do aparelho ativo'
        : 'Disponível no app instalado com biometria no aparelho';
    }
  }

  checkAppLock() {
    if (!this._state.onb) return;
    if (!this._state.pin) {
      this.promptMustCreatePin();
      return;
    }
    const lockEl = document.querySelector('#lock');
    if (lockEl) {
      lockEl.hidden = false;
      const box = lockEl.querySelector('.lockc');
      if (box) {
        PinPad.render(box, {
          mode: 'verify',
          title: 'Fit Systekna',
          sub: 'Digite seu PIN para acessar.',
          bio: !!this._state.bio,
          len: this._state.pinLen,
          onBio: async () => {
            const ok = await BiometricsAdapter.verifyCredential(this._state.bio);
            if (ok) {
              lockEl.hidden = true;
              PinPad.clearActive();
            }
          },
          check: async v => {
            const h = await BiometricsAdapter.hashPin(v);
            return h === this._state.pin;
          },
          onOk: () => {
            lockEl.hidden = true;
            PinPad.clearActive();
          },
          onForgot: () => this.promptRecoverPin(lockEl)
        });
      }
    }
  }

  promptRecoverPin(lockEl) {
    this._sheet.open(`
      <h3 style="margin-top:0">Recuperação de Acesso</h3>
      <p style="font-size:13px;color:var(--soft);margin-bottom:12px">
        Cole as suas 12 palavras na ordem correta ou digite o código Hash de 12 caracteres do seu Certificado de Segurança:
      </p>

      <div style="margin-bottom:12px">
        <textarea id="inpRecoverySecretSmart" class="f-in" rows="3" style="width:100%;resize:none;font-family:monospace;font-size:13px" placeholder="ex: borbulha lotado gradual ... ou XXXX-XXXX-XXXX" spellcheck="false" autocomplete="off"></textarea>
      </div>

      <div id="recErrorSmart" style="color:var(--bad);font-size:12px;margin-bottom:12px;min-height:16px"></div>

      <button type="button" class="btn pri block" id="btnValidateRecoverySmart" style="width:100%">Validar e Redefinir PIN</button>
      <button type="button" class="btn sec block" id="btnCancelRecoverySmart" style="margin-top:8px;width:100%">Voltar</button>
    `);

    const btnCancel = document.querySelector('#btnCancelRecoverySmart');
    if (btnCancel) {
      btnCancel.onclick = () => {
        this._sheet.close();
        this.checkAppLock();
      };
    }

    const btnValidate = document.querySelector('#btnValidateRecoverySmart');
    if (btnValidate) {
      btnValidate.onclick = async () => {
        const inp = document.querySelector('#inpRecoverySecretSmart');
        const errEl = document.querySelector('#recErrorSmart');
        if (!inp) return;

        const val = inp.value.trim();
        const res = await SecurityRecoveryService.verifyRecoveryInput(val, this._state.seedHash, this._state.seedWords);

        if (!res.ok) {
          if (errEl) errEl.textContent = res.message || 'Segredo incorreto.';
          return;
        }

        this._sheet.open(`
          <h3 style="margin-top:0;color:var(--accent)">Segredo Validado!</h3>
          <p style="font-size:13px;color:var(--soft)">Defina seu novo PIN de 4 a 6 dígitos:</p>
          <div id="pinBoxNewSmart"></div>
        `);

        const boxNew = document.querySelector('#pinBoxNewSmart');
        if (boxNew) {
          PinPad.renderCreationFlow(boxNew, {
            onDone: async newPin => {
              this._state.pin = await BiometricsAdapter.hashPin(newPin);
              this._state.pinLen = newPin.length;
              this.save();

              if (lockEl) lockEl.hidden = true;
              PinPad.clearActive();
              this._sheet.close();
              this._toast.show('Novo PIN redefinido com sucesso! Acesso liberado.');
            }
          });
        }
      };
    }
  }

  lockApp() {
    const lockEl = document.querySelector('#lock');
    if (lockEl) {
      lockEl.hidden = false;
      this.checkAppLock();
    }
  }

  promptMustCreatePin() {
    this._sheet.open(`
      <h3 id="shT">Criar PIN Obrigatório</h3>
      <p class="lead">Para proteger seus dados de saúde, defina um PIN de 4 a 6 dígitos.</p>
      <div id="pinBoxCreate"></div>
    `);
    const box = document.querySelector('#pinBoxCreate');
    if (box) {
      PinPad.renderCreationFlow(box, {
        title: 'Criar PIN',
        onDone: async p => {
          await this.ensureSeed();
          this._state.pin = await BiometricsAdapter.hashPin(p);
          this._state.pinLen = p.length;
          this.save();
          this.displayWordsModal(true);
        }
      });
    }
  }

  startOnboarding() {
    const onbEl = document.querySelector('#onb');
    if (!onbEl) return;
    onbEl.hidden = false;
    let step = 0;
    const obData = {
      nome: '',
      sexo: 'm',
      nasc: '1995-01-01',
      alt: '175',
      peso: '80',
      meta: '75',
      ritmo: '0.5',
      ativ: '1.2'
    };

    const renderStep = () => {
      const container = onbEl.querySelector('#onbIn');
      if (!container) return;

      if (step === 0) {
        container.innerHTML = `
          <div class="onb">
            <img class="appic" src="${APPIC}" alt="Fit Systekna">
            <h1>Bem-vindo ao Fit Systekna</h1>
            <p class="lead">Peso, dieta, treinos e saúde num só lugar. Seus dados ficam estritamente neste aparelho.</p>
            <form class="form" id="obF0">
              <button class="btn pri">Começar</button>
            </form>
          </div>
        `;
        container.querySelector('#obF0').onsubmit = e => {
          e.preventDefault();
          step = 1;
          renderStep();
        };
      } else if (step === 1) {
        container.innerHTML = `
          <div class="onb">
            <h1>Sobre você</h1>
            <form class="glass pad form" id="obF1">
              <div class="f">
                <label>Como quer ser chamado</label>
                <input type="text" id="obNome" value="${obData.nome}" required>
              </div>
              <div class="f">
                <label>Altura (cm)</label>
                <input type="number" id="obAlt" value="${obData.alt}" required>
              </div>
              <button class="btn pri" style="margin-top:12px">Continuar</button>
            </form>
          </div>
        `;
        container.querySelector('#obF1').onsubmit = e => {
          e.preventDefault();
          obData.nome = container.querySelector('#obNome').value;
          obData.alt = container.querySelector('#obAlt').value;
          step = 2;
          renderStep();
        };
      } else if (step === 2) {
        container.innerHTML = `
          <div class="onb">
            <h1>Seu objetivo</h1>
            <form class="glass pad form" id="obF2">
              <div class="two">
                <div class="f">
                  <label>Peso atual (kg)</label>
                  <input type="number" step="0.1" id="obPeso" value="${obData.peso}" required>
                </div>
                <div class="f">
                  <label>Peso meta (kg)</label>
                  <input type="number" step="0.1" id="obMeta" value="${obData.meta}" required>
                </div>
              </div>
              <button class="btn pri" style="margin-top:12px">Continuar</button>
            </form>
          </div>
        `;
        container.querySelector('#obF2').onsubmit = e => {
          e.preventDefault();
          obData.peso = container.querySelector('#obPeso').value;
          obData.meta = container.querySelector('#obMeta').value;
          step = 3;
          renderStep();
        };
      } else if (step === 3) {
        container.innerHTML = `
          <div class="onb">
            <h1>Crie seu PIN de Segurança</h1>
            <p class="lead">Ele protege seus dados de saúde e será solicitado ao abrir o app.</p>
            <div class="glass pad" id="obPinBox"></div>
          </div>
        `;
        const box = container.querySelector('#obPinBox');
        PinPad.renderCreationFlow(box, {
          title: 'Defina seu PIN',
          onDone: async pin => {
            this._state.perfil = {
              nome: obData.nome,
              alt: Number(obData.alt),
              nasc: obData.nasc,
              ini: Number(obData.peso),
              meta: Number(obData.meta),
              sexo: obData.sexo,
              ativ: Number(obData.ativ),
              ritmo: Number(obData.ritmo),
              agua: 8
            };
            this._state.pesos = [{ id: 'p0', d: this._today, kg: Number(obData.peso) }];
            await this.ensureSeed();
            this._state.pin = await BiometricsAdapter.hashPin(pin);
            this._state.pinLen = pin.length;
            this._state.onb = true;
            this.save();
            onbEl.hidden = true;
            this.renderAll();
            this.handleRoute();
            this.displayWordsModal(true);
          }
        });
      }
    };
    renderStep();
  }

  // --- BACKUP & RESTAURAÇÃO ---

  exportJsonBackup() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this._state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `fit-smart-backup-${this._today}.json`);
    dlAnchor.click();
    this._toast.show('Backup exportado com sucesso.');
  }

  importJsonBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported && imported.perfil) {
          this._state = imported;
          this.save();
          this.renderAll();
          this._toast.show('Dados restaurados com sucesso.');
        } else {
          this._toast.show('Arquivo de backup inválido.');
        }
      } catch (err) {
        this._toast.show('Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  }

  confirmWipeAllData() {
    if (confirm('Tem certeza de que deseja apagar todos os dados deste aparelho? Esta ação é irreversível.')) {
      try {
        localStorage.removeItem('fit-systekna-v1');
      } catch (e) {}
      location.reload();
    }
  }
}
