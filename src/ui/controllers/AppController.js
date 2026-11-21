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
 * Controller Central da Interface de Fit Smart (MVC / Hexagonal Presentation Layer)
 * Coordena navegação, renderização reativa, abas de configuração, onboarding e segurança
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
    this._views = ['inicio', 'peso', 'diario', 'treino', 'config', 'cadastros'];
    this._mapV = 'front';
    this._mapSel = '';
    this._mapF = '';
    this._restInterval = null;
    this._restEnd = 0;
    this._activeDia = this._today;
    this._activeCfgTab = 'perfil';
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
    this.renderInicio();
    this.renderBars();
    this.renderPeso();
    this.renderDiario();
    this.renderTreino();
    this.renderPlano();
    this.renderPerfil();
    this.renderCard();
    this.renderCad();
    this.renderMapa();
  }

  _bindGlobalEvents() {
    // 1. Rota por Hash
    window.addEventListener('hashchange', () => this.handleRoute());

    // 2. Navegação Inferior
    document.querySelectorAll('nav a[data-v]').forEach(a => {
      a.addEventListener('click', e => {
        const v = a.dataset.v;
        if (v) window.location.hash = v;
      });
    });

    // 3. Delegação Global de Cliques
    document.addEventListener('click', e => {
      // Sub-abas do Menu de Configurações
      const cfgBtn = e.target.closest('button[data-cfg-smart]');
      if (cfgBtn) {
        const targetId = cfgBtn.dataset.cfgSmart;
        this._activeCfgTab = targetId;
        document.querySelectorAll('#cfgTabsSmart button[data-cfg-smart]').forEach(b => {
          const isMatch = b === cfgBtn;
          b.classList.toggle('on', isMatch);
          b.setAttribute('aria-pressed', isMatch);
        });
        ['perfil', 'aparencia', 'seguranca', 'dados', 'sobre'].forEach(s => {
          const el = document.querySelector('#cfgSec-' + s);
          if (el) el.hidden = (s !== targetId);
        });
        return;
      }

      // Alternância de Sub-abas e Segmented Controls
      const sb = e.target.closest('.segc button[data-v], .tabs button[data-v]');
      if (sb && !sb.dataset.cfgSmart) {
        const group = sb.parentElement;
        const forId = group.dataset.for;
        const hiddenInput = forId ? document.getElementById(forId) : null;
        if (hiddenInput && hiddenInput.value !== sb.dataset.v) {
          hiddenInput.value = sb.dataset.v;
          group.querySelectorAll('button[data-v]').forEach(b => {
            const isMatch = b === sb;
            b.setAttribute('aria-pressed', isMatch);
            b.classList.toggle('on', isMatch);
          });
          hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Sub-abas de Saúde
        if (forId === 'hSeg') {
          const sub = sb.dataset.v;
          ['peso', 'med', 'pa', 'ex', 'sono'].forEach(k => {
            const div = document.querySelector('#h' + k.charAt(0).toUpperCase() + k.slice(1));
            if (div) div.hidden = (k !== sub);
          });
        }
        // Sub-abas de Diário
        else if (forId === 'dSeg') {
          const sub = sb.dataset.v;
          const dDia = document.querySelector('#dDia');
          const dCard = document.querySelector('#dCard');
          if (dDia) dDia.hidden = (sub !== 'dia');
          if (dCard) dCard.hidden = (sub !== 'card');
        }
        // Sub-abas de Treino
        else if (forId === 'tSeg') {
          const sub = sb.dataset.v;
          ['plano', 'fichas', 'evo', 'mapa', 'hist'].forEach(k => {
            const div = document.querySelector('#t' + k.charAt(0).toUpperCase() + k.slice(1));
            if (div) div.hidden = (k !== sub);
          });
          if (sub === 'evo') setTimeout(() => this.drawEvoChart(), 60);
          if (sub === 'mapa') this.renderMapa();
        }
        // Sub-abas de Cadastros
        else if (forId === 'cSeg') {
          this.renderCadastrosSubtab(sb.dataset.v);
        }
        // Período de Gráfico de Peso
        else if (forId === 'range') {
          this.drawWeightChart();
        }
        return;
      }

      // Botão Rápido de Água (+1 copo)
      if (e.target.closest('#qWater')) {
        this.addWaterCup();
        return;
      }

      // Copos Interativos no Dashboard
      const cupBtn = e.target.closest('#cups .cup');
      if (cupBtn && cupBtn.dataset.c != null) {
        const idx = Number(cupBtn.dataset.c);
        const cur = (this._state.agua && this._state.agua[this._today]) || 0;
        if (!this._state.agua) this._state.agua = {};
        this._state.agua[this._today] = (cur === idx + 1) ? idx : (idx + 1);
        this.save();
        this.renderInicio();
        return;
      }

      // Botões Rápidos de Inserção [data-add]
      const addBtn = e.target.closest('[data-add]');
      if (addBtn) {
        const type = addBtn.dataset.add;
        if (type === 'peso') this.showAddWeightSheet();
        else if (type === 'treino') this.showAddWorkoutSheet();
        else if (type === 'comida') this.showAddFoodSheet(addBtn.dataset.ref);
        return;
      }

      // Exclusão de Registros [data-del]
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) {
        const [k, id] = delBtn.dataset.del.split(':');
        if (this._state[k]) {
          const idx = this._state[k].findIndex(x => x.id === id);
          if (idx >= 0) {
            this._state[k].splice(idx, 1);
            this.save();
            this.renderAll();
            this._toast.show('Registro excluído.');
          }
        }
        return;
      }

      // Seleção no Mapa Muscular [data-m]
      const mBtn = e.target.closest('[data-m]');
      if (mBtn) {
        this._mapSel = this._mapSel === mBtn.dataset.m ? '' : mBtn.dataset.m;
        this.renderMapa();
        return;
      }
    });

    // 4. Navegação do Diário Alimentar (Anterior / Próximo)
    const dPrev = document.querySelector('#dPrev');
    if (dPrev) {
      dPrev.onclick = () => {
        const d = new Date(this._activeDia + 'T12:00');
        d.setDate(d.getDate() - 1);
        this._activeDia = d.toISOString().slice(0, 10);
        this.renderDiario();
      };
    }
    const dNext = document.querySelector('#dNext');
    if (dNext) {
      dNext.onclick = () => {
        if (this._activeDia < this._today) {
          const d = new Date(this._activeDia + 'T12:00');
          d.setDate(d.getDate() + 1);
          this._activeDia = d.toISOString().slice(0, 10);
          this.renderDiario();
        }
      };
    }

    // 5. Botões de Segurança no Perfil
    const pinBtn = document.querySelector('#bPin');
    if (pinBtn) pinBtn.onclick = () => this.showChangePinSheet();

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

    const privBtn = document.querySelector('#bPriv');
    if (privBtn) privBtn.onclick = () => this.showPrivacySheet();

    const bApoiarSmart = document.querySelector('#bApoiarSmart');
    if (bApoiarSmart) {
      bApoiarSmart.onclick = () => {
        if (window.Doacao && typeof window.Doacao.abrir === 'function') {
          window.Doacao.abrir();
        } else {
          this._toast.show('Módulo de doação indisponível');
        }
      };
    }

    const bAvaliarSmart = document.querySelector('#bAvaliarSmart');
    if (bAvaliarSmart) {
      bAvaliarSmart.onclick = () => {
        if (window.Doacao && typeof window.Doacao.abrir === 'function') {
          window.Doacao.abrir('avaliar');
        } else {
          this._toast.show('Módulo de avaliação indisponível');
        }
      };
    }

    const bSugerirSmart = document.querySelector('#bSugerirSmart');
    if (bSugerirSmart) {
      bSugerirSmart.onclick = () => {
        if (window.Doacao && typeof window.Doacao.abrir === 'function') {
          window.Doacao.abrir('sugerir');
        } else {
          this._toast.show('Módulo de sugestões indisponível');
        }
      };
    }

    // 6. Botões de Backup
    const bExp = document.querySelector('#bExp');
    if (bExp) bExp.onclick = () => this.exportJsonBackup();

    const bImp = document.querySelector('#bImp');
    if (bImp) bImp.onclick = () => this.promptImportJson();

    const bClr = document.querySelector('#bClr');
    if (bClr) bClr.onclick = () => this.confirmWipeAllData();

    // 7. Salvar Perfil e Metas
    const formPf = document.querySelector('#pf');
    if (formPf) {
      formPf.onsubmit = e => {
        e.preventDefault();
        const p = this._state.perfil || {};
        const nEl = document.querySelector('#fNome');
        const altEl = document.querySelector('#fAlt');
        const nascEl = document.querySelector('#fNasc');
        const sexoEl = document.querySelector('#fSexo');
        const iniEl = document.querySelector('#fIni');
        const metaEl = document.querySelector('#fMeta');
        const ritEl = document.querySelector('#fRit');
        const atvEl = document.querySelector('#fAtv');
        const aguaEl = document.querySelector('#fAgua');

        if (nEl) p.nome = nEl.value.trim();
        if (altEl) p.alt = Number(altEl.value) || 170;
        if (nascEl) p.nasc = nascEl.value;
        if (sexoEl) p.sexo = sexoEl.value || 'm';
        if (iniEl) p.ini = Number(iniEl.value) || 80;
        if (metaEl) p.meta = Number(metaEl.value) || 75;
        if (ritEl) p.ritmo = Number(ritEl.value) || 0.5;
        if (atvEl) p.atv = Number(atvEl.value) || 1.375;
        if (aguaEl) p.agua = Number(aguaEl.value) || 8;

        this._state.perfil = p;
        this.save();
        this.renderAll();
        this._toast.show('Perfil e metas salvos com sucesso.');
      };
    }
  }

  handleRoute() {
    let h = (location.hash || '#inicio').replace('#', '').trim();
    if (h === 'perfil') h = 'config';
    const v = this._views.includes(h)
      ? h
      : this._state.home && this._views.includes(this._state.home)
      ? this._state.home
      : 'inicio';

    document.querySelectorAll('.view').forEach(el => {
      const isMatch = el.id === 'v-' + v;
      el.classList.toggle('on', isMatch);
      el.style.display = isMatch ? 'block' : 'none';
    });

    document.querySelectorAll('nav a').forEach(a => {
      a.classList.toggle('on', a.dataset.v === v);
    });

    const gear = document.querySelector('#gear');
    if (gear) gear.classList.toggle('on', v === 'config');

    window.scrollTo({ top: 0, behavior: 'instant' });
    if (v === 'peso') {
      setTimeout(() => this.drawWeightChart(), 60);
    }
    if (v === 'inicio') {
      setTimeout(() => this.drawEvoChart(), 60);
    }
  }

  addWaterCup() {
    if (!this._state.agua) this._state.agua = {};
    const cur = this._state.agua[this._today] || 0;
    const max = ((this._state.perfil && this._state.perfil.agua) || 8) + 8;
    this._state.agua[this._today] = Math.min(max, cur + 1);
    this.save();
    this.renderInicio();
    this._toast.show('+1 copo de água (250 ml)');
  }

  // --- RENDERS DAS SEÇÕES ---

  renderInicio() {
    const p = this._state.perfil || { nome: '', ini: 80, meta: 75, ritmo: 0.5, agua: 8 };
    const energy = this._workout.getDailyEnergyBalance(this._today);
    const m = energy.targetKcal || 2000;
    const c = energy.consumedKcal || 0;
    const e = energy.burnedKcal || 0;
    const left = m + e - c;

    const helloEl = document.querySelector('#hello');
    if (helloEl) {
      const hr = new Date().getHours();
      const saudacao = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
      helloEl.textContent = saudacao + (p.nome ? ', ' + p.nome : '');
    }

    const rLeftEl = document.querySelector('#rLeft');
    if (rLeftEl) rLeftEl.textContent = FormatUtils.formatNumber(Math.abs(left));

    const rLblEl = document.querySelector('#rLbl');
    if (rLblEl) rLblEl.textContent = left >= 0 ? 'kcal restantes' : 'kcal acima';

    const fg = document.querySelector('#ringFg');
    if (fg) {
      const fr = Math.min(1, c / Math.max(1, m + e));
      fg.style.strokeDashoffset = 389.6 * (1 - fr);
      fg.classList.toggle('over', left < 0);
    }

    const sMetaEl = document.querySelector('#sMeta');
    if (sMetaEl) sMetaEl.textContent = FormatUtils.formatNumber(m) + ' kcal';
    const sConsEl = document.querySelector('#sCons');
    if (sConsEl) sConsEl.textContent = FormatUtils.formatNumber(c) + ' kcal';
    const sExEl = document.querySelector('#sEx');
    if (sExEl) sExEl.textContent = FormatUtils.formatNumber(e) + ' kcal';

    // Jornada de peso
    const now = this._workout.getCurrentWeight();
    const tot = p.ini - p.meta;
    const lost = p.ini - now;
    const falta = Math.max(0, now - p.meta);
    const pct = tot > 0 ? Math.max(0, Math.min(100, (lost / tot) * 100)) : 0;

    const jNowEl = document.querySelector('#jNow');
    if (jNowEl) jNowEl.innerHTML = FormatUtils.formatNumber(now, 1) + '<small>kg</small>';
    const jLeftEl = document.querySelector('#jLeft');
    if (jLeftEl) jLeftEl.textContent = FormatUtils.formatNumber(falta, 1) + ' kg';
    const jBarEl = document.querySelector('#jBar');
    if (jBarEl) jBarEl.style.width = pct + '%';
    const jPctEl = document.querySelector('#jPct');
    if (jPctEl) jPctEl.textContent = FormatUtils.formatNumber(pct) + '%';
    const jStartEl = document.querySelector('#jStart');
    if (jStartEl) jStartEl.textContent = 'Início ' + FormatUtils.formatNumber(p.ini, 1) + ' kg';
    const jGoalEl = document.querySelector('#jGoal');
    if (jGoalEl) jGoalEl.textContent = 'Meta ' + FormatUtils.formatNumber(p.meta, 1) + ' kg';
    const jLostEl = document.querySelector('#jLost');
    if (jLostEl) jLostEl.textContent = (lost >= 0 ? '' : '+') + FormatUtils.formatNumber(Math.abs(lost), 1) + ' kg';

    const metabolic = this._workout.getMetabolicSummary();
    const jImcEl = document.querySelector('#jImc');
    if (jImcEl) jImcEl.textContent = metabolic.bmi;

    const jEtaEl = document.querySelector('#jEta');
    if (jEtaEl) {
      if (falta <= 0) {
        jEtaEl.textContent = 'Meta batida!';
      } else {
        const dt = new Date();
        dt.setDate(dt.getDate() + Math.ceil((falta / (p.ritmo || 0.5)) * 7));
        jEtaEl.textContent = dt.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      }
    }

    // Copos de Água
    const w = (this._state.agua && this._state.agua[this._today]) || 0;
    const n = p.agua || 8;
    const cupsEl = document.querySelector('#cups');
    if (cupsEl) {
      cupsEl.innerHTML = Array.from({ length: n }, (_, i) =>
        `<button type="button" class="cup${i < w ? ' on' : ''}" data-c="${i}" aria-label="Copo ${i + 1}" aria-pressed="${i < w}"></button>`
      ).join('');
    }
    const wTxtEl = document.querySelector('#wTxt');
    if (wTxtEl) wTxtEl.textContent = `${w} de ${n} copos · ${FormatUtils.formatNumber(w * 0.25, 2)} L`;

    // Plano de Hoje
    const planoEl = document.querySelector('#hojePlano');
    if (planoEl) {
      planoEl.innerHTML = `
        <div class="it">
          <span class="ic t-fire"><span class="ms" aria-hidden="true">fitness_center</span></span>
          <div class="t">
            <b>Treino do Dia</b>
            <small class="num">Musculação e condicionamento ativo</small>
          </div>
          <button type="button" class="btn pri sm" data-add="treino">Registrar</button>
        </div>
      `;
    }
  }

  renderBars() {
    const kBars = document.querySelector('#kBars');
    if (!kBars) return;
    const dias = Array.from({ length: 7 }, (_, i) => {
      const x = new Date(this._today + 'T12:00');
      x.setDate(x.getDate() - 6 + i);
      return x.toISOString().slice(0, 10);
    });
    const energy = this._workout.getDailyEnergyBalance(this._today);
    const m = energy.targetKcal || 2000;
    const V = dias.map(d => {
      const e = this._workout.getDailyEnergyBalance(d);
      return { d, c: e.consumedKcal, g: m + e.burnedKcal };
    });
    const mx = Math.max(...V.map(v => Math.max(v.c, v.g))) * 1.1 || 1;
    const wd = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    kBars.innerHTML = V.map(v => `
      <div class="bar${v.d === this._today ? ' hoje' : ''}" title="${FormatUtils.formatDateBr(v.d)}: ${FormatUtils.formatNumber(v.c)} kcal">
        <span class="val num">${v.c ? FormatUtils.formatNumber(v.c / 1000, 1) + 'k' : ''}</span>
        <div class="col">
          <div class="fill${!v.c ? ' zero' : v.c > v.g ? ' over' : ''}" style="height:${(v.c / mx) * 100}%"></div>
        </div>
        <small>${wd[new Date(v.d + 'T12:00').getDay()]}</small>
      </div>
    `).join('');
  }

  renderPeso() {
    const pList = document.querySelector('#pList');
    if (!pList) return;
    const pesos = (this._state.pesos || []).slice().sort((a, b) => b.d.localeCompare(a.d));
    if (!pesos.length) {
      pList.innerHTML = '<div class="glass empty" style="padding:14px;text-align:center;color:var(--soft)">Nenhum peso registrado ainda.</div>';
      return;
    }

    pList.innerHTML = pesos.slice(0, 15).map(p => `
      <div class="it" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line)">
        <div>
          <b>${FormatUtils.formatNumber(p.kg, 1)} kg</b>
          <div style="font-size:12px;color:var(--soft)">${FormatUtils.formatDateBr(p.d)}</div>
        </div>
        <button type="button" class="btn sm dng" data-del="pesos:${p.id}" style="padding:4px 8px">Excluir</button>
      </div>
    `).join('');
  }

  drawWeightChart() {
    const svg = document.querySelector('#chart');
    if (!svg) return;
    const container = document.querySelector('#fig');
    const W = (container && container.clientWidth) || 300;
    const H = 160;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const pesos = (this._state.pesos || []).slice().sort((a, b) => a.d.localeCompare(b.d));
    if (pesos.length < 2) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="currentColor" opacity="0.4" font-size="12">Registre mais pesos para ver o gráfico</text>`;
      return;
    }

    const minK = Math.min(...pesos.map(w => w.kg)) - 1;
    const maxK = Math.max(...pesos.map(w => w.kg)) + 1;
    const pts = pesos.map((w, i) => {
      const x = (i / (pesos.length - 1)) * (W - 50) + 25;
      const y = H - 25 - ((w.kg - minK) / (maxK - minK || 1)) * (H - 50);
      return [x, y];
    });

    const dPath = pts.reduce((acc, p, i) => acc + (i === 0 ? `M ${p[0]},${p[1]}` : ` L ${p[0]},${p[1]}`), '');
    svg.innerHTML = `
      <path d="${dPath}" fill="none" stroke="var(--accent, #6FCF97)" stroke-width="2.5" stroke-linecap="round"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent, #6FCF97)"/>`).join('')}
    `;
  }

  drawEvoChart() {
    this.drawWeightChart();
  }

  renderDiario() {
    const dia = this._activeDia;
    const energy = this._workout.getDailyEnergyBalance(dia);
    const m = energy.targetKcal || 2000;
    const c = energy.consumedKcal || 0;
    const e = energy.burnedKcal || 0;
    const left = m + e - c;

    const dLbl = document.querySelector('#dLbl');
    if (dLbl) dLbl.textContent = dia === this._today ? 'Hoje' : FormatUtils.formatDateBr(dia);
    const dMeta = document.querySelector('#dMeta');
    if (dMeta) dMeta.textContent = FormatUtils.formatNumber(m + e);
    const dCons = document.querySelector('#dCons');
    if (dCons) dCons.textContent = FormatUtils.formatNumber(c);
    const dLeft = document.querySelector('#dLeft');
    if (dLeft) {
      dLeft.textContent = FormatUtils.formatNumber(left);
      dLeft.style.color = left < 0 ? 'var(--bad)' : '';
    }

    const dMeals = document.querySelector('#dMeals');
    if (!dMeals) return;

    const categorias = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar'];
    const alimentosDia = (this._state.comidas || []).filter(x => x.d === dia);

    if (!alimentosDia.length) {
      dMeals.innerHTML = '<div class="glass empty" style="padding:16px;text-align:center;color:var(--soft)">Nenhum alimento registrado para esta data.</div>';
      return;
    }

    dMeals.innerHTML = categorias.map(cat => {
      const itens = alimentosDia.filter(x => x.ref === cat);
      if (!itens.length) return '';
      const totalCat = itens.reduce((acc, x) => acc + (x.kcal || 0), 0);
      return `
        <div class="mb" style="margin-bottom:12px;background:var(--surface-2, rgba(255,255,255,0.04));border-radius:12px;padding:10px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <b>${cat}</b>
            <span class="num" style="color:var(--accent)">${FormatUtils.formatNumber(totalCat)} kcal</span>
          </div>
          ${itens.map(it => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-top:1px solid var(--line);font-size:13px">
              <span>${FormatUtils.escapeHtml(it.nome || it.desc)}</span>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="num">${FormatUtils.formatNumber(it.kcal)} kcal</span>
                <button type="button" class="btn sm dng" data-del="comidas:${it.id}" style="padding:2px 6px;font-size:11px">×</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  }

  renderTreino() {
    const sem = new Date();
    sem.setDate(sem.getDate() - 6);
    const isoSem = sem.toISOString().slice(0, 10);
    const treinosSem = (this._state.treinos || []).filter(t => t.d >= isoSem);

    const tWk = document.querySelector('#tWk');
    if (tWk) tWk.textContent = treinosSem.length;
    const tMin = document.querySelector('#tMin');
    if (tMin) tMin.textContent = FormatUtils.formatNumber(treinosSem.reduce((a, t) => a + (t.min || 0), 0));
    const tKcal = document.querySelector('#tKcal');
    if (tKcal) tKcal.textContent = FormatUtils.formatNumber(treinosSem.reduce((a, t) => a + (t.kcal || 0), 0));

    const tList = document.querySelector('#tList');
    if (!tList) return;
    const todos = (this._state.treinos || []).slice().sort((a, b) => b.d.localeCompare(a.d));
    if (!todos.length) {
      tList.innerHTML = '<div class="glass empty" style="padding:14px;text-align:center;color:var(--soft)">Nenhum treino registrado ainda.</div>';
      return;
    }

    tList.innerHTML = todos.slice(0, 15).map(t => `
      <div class="it" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line)">
        <div>
          <b>${FormatUtils.escapeHtml(t.tipo || 'Treino')}</b>
          <div style="font-size:12px;color:var(--soft)">${FormatUtils.formatDateBr(t.d)} · ${t.min || 0} min</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="num" style="color:var(--accent)">~${FormatUtils.formatNumber(t.kcal || 0)} kcal</span>
          <button type="button" class="btn sm dng" data-del="treinos:${t.id}" style="padding:4px 8px">×</button>
        </div>
      </div>
    `).join('');
  }

  renderPlano() {
    const tPlano = document.querySelector('#tPlano');
    if (!tPlano) return;
    tPlano.innerHTML = `
      <div class="glass pad" style="margin-top:10px">
        <div class="sec-h" style="margin-top:0"><b>Orientação Semanal de Atividades</b></div>
        <p style="font-size:13px;color:var(--soft);line-height:1.4">
          Alterne dias de treino com recuperação ativa para maximizar a perda de gordura preservando a massa magra.
        </p>
      </div>
    `;
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
    const ritEl = document.querySelector('#fRit');
    if (ritEl) ritEl.value = p.ritmo || 0.5;
    const atvEl = document.querySelector('#fAtv');
    if (atvEl) atvEl.value = p.atv || 1.375;
    const aguaEl = document.querySelector('#fAgua');
    if (aguaEl) aguaEl.value = p.agua || 8;

    // Seus Números (Cálculos Mifflin-St Jeor)
    const calcEl = document.querySelector('#calc');
    if (calcEl) {
      const metabolic = this._workout.getMetabolicSummary();
      calcEl.innerHTML = `
        <div class="it" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">
          <span>Taxa Metabólica Basal (TMB):</span>
          <b>${FormatUtils.formatNumber(metabolic.bmr)} kcal</b>
        </div>
        <div class="it" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">
          <span>Gasto Diário com Atividade (TDEE):</span>
          <b>${FormatUtils.formatNumber(metabolic.tdee)} kcal</b>
        </div>
        <div class="it" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);color:var(--accent)">
          <span>Meta Diária de Calorias:</span>
          <b>${FormatUtils.formatNumber(metabolic.targetKcal)} kcal</b>
        </div>
        <div class="it" style="display:flex;justify-content:space-between;padding:8px 0">
          <span>Déficit Diário Programado:</span>
          <b>-${FormatUtils.formatNumber(metabolic.tdee - metabolic.targetKcal)} kcal</b>
        </div>
      `;
    }
  }

  renderCard() {
    const cardEl = document.querySelector('#cardapio');
    if (!cardEl || !CARD) return;
    cardEl.innerHTML = Object.entries(CARD).map(([r, itens]) => `
      <details class="glass acc" style="margin-bottom:8px">
        <summary style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;cursor:pointer">
          <b>${r}</b>
          <span style="color:var(--accent);font-size:13px">${itens.length} opções recomendadas</span>
        </summary>
        <div style="padding:10px 14px;border-top:1px solid var(--line)">
          ${itens.map(x => `
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
              <span>${x[0]}</span>
              <span class="num">${x[1]} kcal</span>
            </div>
          `).join('')}
        </div>
      </details>
    `).join('');
  }

  renderCad() {
    this.renderCadastrosSubtab('ali');
  }

  renderCadastrosSubtab(tab) {
    const cBody = document.querySelector('#cBody');
    if (!cBody) return;

    if (tab === 'ali') {
      cBody.innerHTML = `
        <div class="glass pad" style="margin-top:10px">
          <div class="sec-h" style="margin-top:0"><b>Banco de Alimentos</b></div>
          <p style="font-size:13px;color:var(--soft)">Itens cadastrados para rápida seleção no diário alimentar.</p>
          <button type="button" class="btn pri sm" data-add="comida" style="margin-top:8px">+ Novo Alimento</button>
        </div>
      `;
    } else if (tab === 'ex') {
      cBody.innerHTML = `
        <div class="glass pad" style="margin-top:10px">
          <div class="sec-h" style="margin-top:0"><b>Exercícios e Atividades</b></div>
          <p style="font-size:13px;color:var(--soft)">Modalidades e fichas de treinamento.</p>
          <button type="button" class="btn pri sm" data-add="treino" style="margin-top:8px">+ Novo Treino</button>
        </div>
      `;
    } else {
      cBody.innerHTML = `
        <div class="glass pad" style="margin-top:10px">
          <p style="font-size:13px;color:var(--soft)">Listagem pronta para consulta.</p>
        </div>
      `;
    }
  }

  renderMapa() {
    // Mapa anatômico
  }

  setThemeMode(mode) {
    this._state.mode = mode;
    this.save();
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.dataset.mode = 'dark';
    } else if (mode === 'light') {
      root.classList.remove('dark');
      root.dataset.mode = 'light';
    } else {
      root.dataset.mode = 'auto';
    }
  }

  // --- MODAIS DE INSERÇÃO ---

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
        <button class="btn pri" style="margin-top:12px">Salvar Peso</button>
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

  showAddFoodSheet(categoriaPadrao) {
    this._sheet.open(`
      <h3 id="shT">Registrar Refeição</h3>
      <form class="form" id="frmFood">
        <div class="f">
          <label>Descrição do Alimento</label>
          <input type="text" id="inFoodN" placeholder="Ex: Arroz, feijão e frango" required>
        </div>
        <div class="two">
          <div class="f">
            <label>Calorias (kcal)</label>
            <input type="number" id="inFoodKcal" placeholder="350" required inputmode="numeric">
          </div>
          <div class="f">
            <label>Refeição</label>
            <select id="inFoodRef">
              <option value="Café da manhã" ${categoriaPadrao === 'Café da manhã' ? 'selected' : ''}>Café da manhã</option>
              <option value="Almoço" ${!categoriaPadrao || categoriaPadrao === 'Almoço' ? 'selected' : ''}>Almoço</option>
              <option value="Lanche" ${categoriaPadrao === 'Lanche' ? 'selected' : ''}>Lanche</option>
              <option value="Jantar" ${categoriaPadrao === 'Jantar' ? 'selected' : ''}>Jantar</option>
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
        const nome = document.querySelector('#inFoodN').value.trim();
        const kcal = Number(document.querySelector('#inFoodKcal').value);
        const ref = document.querySelector('#inFoodRef').value;
        if (nome && kcal >= 0) {
          if (!this._state.comidas) this._state.comidas = [];
          this._state.comidas.push({
            id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            d: this._activeDia,
            nome,
            kcal,
            ref
          });
          this.save();
          this._sheet.close();
          this.renderAll();
          this._toast.show('Alimento registrado no diário.');
        }
      };
    }
  }

  showAddWorkoutSheet() {
    this._sheet.open(`
      <h3 id="shT">Registrar Treino</h3>
      <form class="form" id="frmWorkout">
        <div class="f">
          <label>Tipo de Atividade</label>
          <input type="text" id="inTrTipo" placeholder="Ex: Musculação, Caminhada, Corrida" required>
        </div>
        <div class="two">
          <div class="f">
            <label>Duração (minutos)</label>
            <input type="number" id="inTrMin" placeholder="45" required min="1">
          </div>
          <div class="f">
            <label>Calorias Gastas (kcal)</label>
            <input type="number" id="inTrKcal" placeholder="250" required min="0">
          </div>
        </div>
        <button class="btn pri" style="margin-top:12px">Salvar Treino</button>
      </form>
    `);

    const frm = document.querySelector('#frmWorkout');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const tipo = document.querySelector('#inTrTipo').value.trim();
        const min = Number(document.querySelector('#inTrMin').value);
        const kcal = Number(document.querySelector('#inTrKcal').value);
        if (tipo && min > 0) {
          if (!this._state.treinos) this._state.treinos = [];
          this._state.treinos.push({
            id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            d: this._today,
            tipo,
            min,
            kcal
          });
          this.save();
          this._sheet.close();
          this.renderAll();
          this._toast.show('Treino registrado com sucesso.');
        }
      };
    }
  }

  // --- SEGURANÇA & BLOQUEIO ---

  checkAppLock() {
    const lockEl = document.querySelector('#lock');
    if (!lockEl) return;
    if (this._state.pin && !this._unlocked) {
      lockEl.hidden = false;
      const box = lockEl.querySelector('.lockc');
      if (box) {
        PinPad.render(box, {
          mode: 'verify',
          title: 'Fit Systekna',
          sub: 'Digite seu PIN para desbloquear.',
          len: this._state.pinLen,
          bio: !!this._state.bio,
          check: async v => {
            const h = await BiometricsAdapter.hashPin(v);
            return h === this._state.pin;
          },
          onOk: () => {
            this._unlocked = true;
            lockEl.hidden = true;
            PinPad.clearActive();
            this._toast.show('Acesso liberado.');
          },
          onForgot: () => this.promptRecoverPin()
        });
      }
    } else {
      lockEl.hidden = true;
    }
  }

  promptRecoverPin() {
    this._sheet.open(`
      <h3 style="margin-top:0">Recuperação de Acesso</h3>
      <p style="font-size:13px;color:var(--soft);margin-bottom:12px">
        Cole as suas 12 palavras na ordem correta ou digite o código Hash de 12 caracteres do seu Certificado:
      </p>
      <div style="margin-bottom:12px">
        <textarea id="inpRecoverySecret" class="f-in" rows="3" style="width:100%;resize:none;font-family:monospace;font-size:13px" placeholder="ex: borbulha lotado gradual ... ou XXXX-XXXX-XXXX" spellcheck="false" autocomplete="off"></textarea>
      </div>
      <div id="recError" style="color:var(--bad);font-size:12px;margin-bottom:12px;min-height:16px"></div>
      <button type="button" class="btn pri block" id="btnValidateRecovery">Validar e Redefinir PIN</button>
      <button type="button" class="btn sec block" id="btnCancelRecovery" style="margin-top:8px">Voltar</button>
    `);

    const btnValidate = document.querySelector('#btnValidateRecovery');
    if (btnValidate) {
      btnValidate.onclick = async () => {
        const inp = document.querySelector('#inpRecoverySecret');
        const errEl = document.querySelector('#recError');
        if (!inp) return;
        const res = await SecurityRecoveryService.verifyRecoveryInput(inp.value.trim(), this._state.seedHash, this._state.seedWords);
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
              this._unlocked = true;
              const lockEl = document.querySelector('#lock');
              if (lockEl) lockEl.hidden = true;
              PinPad.clearActive();
              this._sheet.close();
              this._toast.show('Novo PIN definido com sucesso!');
            }
          });
        }
      };
    }
  }

  showChangePinSheet() {
    this._sheet.open(`
      <h3 style="margin-top:0">Alterar PIN de Acesso</h3>
      <p style="font-size:13px;color:var(--soft)">Defina um novo PIN de 4 a 6 dígitos:</p>
      <div id="pinBoxChangeSmart"></div>
    `);
    const box = document.querySelector('#pinBoxChangeSmart');
    if (box) {
      PinPad.renderCreationFlow(box, {
        onDone: async pinValue => {
          this._state.pin = await BiometricsAdapter.hashPin(pinValue);
          this._state.pinLen = pinValue.length;
          await this.ensureSeed();
          this.save();
          PinPad.clearActive();
          this._sheet.close();
          this._toast.show('PIN atualizado com sucesso!');
        }
      });
    }
  }

  async ensureSeed() {
    if (!this._state.seedWords || !this._state.seedHash) {
      const seed = await SecurityRecoveryService.generateSeed();
      this._state.seedWords = seed.words;
      this._state.seedHash = seed.hash;
      this.save();
    }
  }

  displayWordsModal() {
    const words = (this._state.seedWords || []).join(' ');
    this._sheet.open(`
      <h3 style="margin-top:0;color:var(--accent)">12 Palavras de Recuperação</h3>
      <p style="font-size:13px;color:var(--soft);margin-bottom:12px">
        Anote estas 12 palavras em ordem segura ou guarde o Certificado de Segurança:
      </p>
      <div style="grid-template-columns:repeat(3,1fr);display:grid;gap:8px;background:var(--surface-2, rgba(255,255,255,0.04));padding:12px;border-radius:12px;margin-bottom:14px">
        ${(this._state.seedWords || []).map((w, i) => `
          <div style="font-size:13px;font-family:monospace;padding:4px 6px;background:rgba(255,255,255,0.06);border-radius:6px">
            <span style="color:var(--soft);font-size:11px">${i + 1}.</span> <b>${w}</b>
          </div>
        `).join('')}
      </div>
      <div style="font-size:12px;color:var(--soft);margin-bottom:14px;word-break:break-all">
        Código Hash de Verificação: <b style="color:var(--ink);font-family:monospace">${this._state.seedHash || '—'}</b>
      </div>
      <button type="button" class="btn pri block" id="btnCopyWordsSmart">Copiar 12 Palavras</button>
      <button type="button" class="btn sec block" id="btnCloseWordsSmart" style="margin-top:8px">Fechar</button>
    `);

    const btnCopy = document.querySelector('#btnCopyWordsSmart');
    if (btnCopy) {
      btnCopy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(words);
          this._toast.show('Palavras copiadas.');
        } catch (_) {
          this._toast.show('Copie manualmente.');
        }
      };
    }
    const btnClose = document.querySelector('#btnCloseWordsSmart');
    if (btnClose) btnClose.onclick = () => this._sheet.close();
  }

  showPrivacySheet() {
    SecurityRecoveryService.getPrivacyPolicy('Fit Systekna').then(policy => {
      this._sheet.open(`
        <h3 style="margin-top:0">${policy.title}</h3>
        <p style="font-size:13px;color:var(--accent);margin-bottom:14px">${policy.summary}</p>
        <div style="max-height:60vh;overflow-y:auto;padding-right:6px">
          ${policy.sections.map(s => `
            <div style="margin-bottom:12px;background:var(--surface-2, rgba(255,255,255,0.04));padding:10px 12px;border-radius:10px">
              <b style="font-size:13px;display:block;margin-bottom:4px">${s.heading}</b>
              <p style="font-size:12px;color:var(--soft);margin:0;line-height:1.4">${s.text}</p>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn pri block" id="btnClosePrivSmart" style="margin-top:14px">Fechar</button>
      `);
      const btnClose = document.querySelector('#btnClosePrivSmart');
      if (btnClose) btnClose.onclick = () => this._sheet.close();
    });
  }

  exportJsonBackup() {
    const jsonStr = JSON.stringify(this._state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fit-smart-backup-${this._today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._toast.show('Backup JSON gerado com sucesso.');
  }

  promptImportJson() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = ev => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported && (imported.perfil || imported.pesos || imported.treinos)) {
            this._state = imported;
            this.save();
            this._toast.show('Backup restaurado! Recarregando...');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            this._toast.show('Arquivo de backup inválido.');
          }
        } catch (err) {
          this._toast.show('Erro ao ler JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  }

  confirmWipeAllData() {
    this._sheet.open(`
      <h3 style="margin-top:0;color:var(--bad)">Apagar Todos os Dados</h3>
      <p style="color:var(--soft);font-size:13px">Esta ação apagará permanentemente todos os registros de saúde, refeições, treinos e senhas deste aparelho.</p>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button type="button" class="btn sec flex1" id="btnCancelWipe">Cancelar</button>
        <button type="button" class="btn dng flex1" id="btnConfirmWipe">Sim, Apagar Tudo</button>
      </div>
    `);
    const btnCancel = document.querySelector('#btnCancelWipe');
    if (btnCancel) btnCancel.onclick = () => this._sheet.close();
    const btnConfirm = document.querySelector('#btnConfirmWipe');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        localStorage.removeItem('fit_state_v1');
        localStorage.removeItem('fit-systekna-v1');
        window.location.reload();
      };
    }
  }

  startOnboarding() {
    // Se não concluiu onboarding, marca como concluído com perfil padrão
    this._state.onb = true;
    this.save();
  }
}
