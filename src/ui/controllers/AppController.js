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
    this._evoEx = '';
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
    this.renderFichas();
    this.renderTreinoEvo();
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

        // Sub-abas de Diário
        if (forId === 'dSeg') {
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
          if (sub === 'plano') this.renderPlano();
          else if (sub === 'fichas') this.renderFichas();
          else if (sub === 'evo') this.renderTreinoEvo();
          else if (sub === 'mapa') this.renderMapa();
          else if (sub === 'hist') this.renderTreino();
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

      // Ações Especiais de Treino e Gestão
      const actBtn = e.target.closest('[data-act]');
      if (actBtn) {
        const act = actBtn.dataset.act;
        if (act === 'semana') this.sheetSemana();
        else if (act === 'novaficha') this.sheetEditFicha();
        else if (act === 'novoex') this.showAddWorkoutSheet();
        return;
      }

      // Execução Rápida de Treino ou Ficha [data-go]
      const goBtn = e.target.closest('[data-go]');
      if (goBtn) {
        this.handleStartWorkout(goBtn.dataset.go);
        return;
      }

      // Edição de Ficha [data-edf]
      const edfBtn = e.target.closest('[data-edf]');
      if (edfBtn) {
        this.sheetEditFicha(edfBtn.dataset.edf);
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

    // 6. Botão de Instalação PWA
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
    });

    const bInstalarApp = document.querySelector('#bInstalarApp');
    if (bInstalarApp) {
      bInstalarApp.onclick = () => {
        if (window.deferredPwaPrompt) {
          window.deferredPwaPrompt.prompt();
          window.deferredPwaPrompt.userChoice.then(choiceResult => {
            if (choiceResult.outcome === 'accepted') {
              this._toast.show('Instalação iniciada com sucesso!');
            }
            window.deferredPwaPrompt = null;
          });
        } else {
          this._sheet.open(`
            <h3 style="margin-top:0">Instalação do Aplicativo</h3>
            <p style="font-size:14px;color:var(--soft);line-height:1.5">
              Este aplicativo funciona como um PWA offline de alta performance. Para adicioná-lo:
            </p>
            <div class="glass pad" style="margin:12px 0;font-size:13px;line-height:1.6">
              <b>No Chrome / Android:</b> Toque no menu do navegador (três pontos) e selecione <b>"Instalar aplicativo"</b> ou <b>"Adicionar à tela inicial"</b>.<br><br>
              <b>No Safari / iOS:</b> Toque no botão de <b>Compartilhar</b> e selecione <b>"Adicionar à Tela de Início"</b>.
            </div>
            <button class="btn pri block" id="bOkInst">Entendido</button>
          `);
          const bOkInst = document.querySelector('#bOkInst');
          if (bOkInst) bOkInst.onclick = () => this._sheet.close();
        }
      };
    }

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
      const pt = this.planoDia(this._today);
      const okT = this.treinoFeito(this._today);
      planoEl.innerHTML = `
        <div class="it" style="display:flex;align-items:center;gap:12px;padding:12px 14px">
          <span class="stat" style="flex:none"><span class="ic ${pt.t === 'des' ? 't-acc' : 't-fire'}">${this.getIcoSvg(pt.ic, 20)}</span></span>
          <div class="t" style="flex:1;min-width:0">
            <b style="display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${FormatUtils.escapeHtml(pt.n)}</b>
            <small class="num" style="display:block;color:var(--faint);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pt.t === 'des' ? 'Recupere: sono e hidratação em dia' : pt.min + ' min · ~' + FormatUtils.formatNumber(pt.kcal) + ' kcal'}</small>
          </div>
          ${okT 
            ? '<span class="badge ok" style="padding:4px 10px;border-radius:8px;font-size:12px;white-space:nowrap;flex:none">Feito ✓</span>' 
            : pt.t === 'des' 
              ? '' 
              : `<button type="button" class="btn pri sm" style="width:auto;flex:none;white-space:nowrap;height:38px;padding:0 16px" data-go="${this.goKey(pt)}">Começar</button>`
          }
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
    // 1. Dados biométricos e cálculo do IMC
    const p = this._state.perfil || {};
    const height = Number(p.alt) || 170;
    const weight = this._workout.getCurrentWeight();
    const bmi = BmrTdeeCalculatorModel.calculateBMI(weight, height);
    const category = BmrTdeeCalculatorModel.classifyBMI(bmi);

    // 2. Faixa ideal OMS (IMC 18.5 a 24.9)
    const hM = height / 100;
    const minIdeal = Math.round(18.5 * hM * hM * 10) / 10;
    const maxIdeal = Math.round(24.9 * hM * hM * 10) / 10;
    let diffText = 'Dentro da faixa ideal';
    let diffColor = 'var(--ok, #6FCF97)';

    if (weight > maxIdeal) {
      const excess = Math.round((weight - maxIdeal) * 10) / 10;
      diffText = `+${FormatUtils.formatNumber(excess, 1)} kg para o peso normal`;
      diffColor = 'var(--warn, #F0B24A)';
    } else if (weight < minIdeal) {
      const lack = Math.round((minIdeal - weight) * 10) / 10;
      diffText = `−${FormatUtils.formatNumber(lack, 1)} kg para o peso normal`;
      diffColor = 'var(--warn, #F0B24A)';
    }

    // 3. Atualiza Mostrador Principal de IMC
    const imcBigVal = document.querySelector('#imcBigVal');
    if (imcBigVal) imcBigVal.textContent = FormatUtils.formatNumber(bmi, 1);

    const imcCatBadge = document.querySelector('#imcCategoryBadge');
    if (imcCatBadge) {
      let catLabel = 'Peso Normal';
      let badgeCls = 'badge ok';
      if (category === 'abaixo do peso') {
        catLabel = 'Abaixo do Peso';
        badgeCls = 'badge warn';
      } else if (category === 'sobrepeso') {
        catLabel = 'Sobrepeso';
        badgeCls = 'badge warn';
      } else if (category.includes('obesidade')) {
        catLabel = category.charAt(0).toUpperCase() + category.slice(1);
        badgeCls = 'badge dng';
      }
      imcCatBadge.className = badgeCls;
      imcCatBadge.textContent = catLabel;
    }

    // 4. Marcador da Régua Visual (escala 15 a 40)
    const indicator = document.querySelector('#imcIndicator');
    if (indicator) {
      const pct = Math.max(5, Math.min(95, ((bmi - 15) / (40 - 15)) * 100));
      indicator.style.left = `${pct}%`;
    }

    // 5. Parâmetros Corporais
    const imcHeightVal = document.querySelector('#imcHeightVal');
    if (imcHeightVal) imcHeightVal.textContent = `${height} cm`;

    const imcWeightVal = document.querySelector('#imcWeightVal');
    if (imcWeightVal) imcWeightVal.textContent = `${FormatUtils.formatNumber(weight, 1)} kg`;

    const imcIdealRange = document.querySelector('#imcIdealRange');
    if (imcIdealRange) imcIdealRange.textContent = `${FormatUtils.formatNumber(minIdeal, 1)} a ${FormatUtils.formatNumber(maxIdeal, 1)} kg`;

    const imcDistVal = document.querySelector('#imcDistanceVal');
    if (imcDistVal) {
      imcDistVal.textContent = diffText;
      imcDistVal.style.color = diffColor;
    }

    // 6. Lista de Registros de Peso
    const pList = document.querySelector('#pList');
    if (pList) {
      const pesos = (this._state.pesos || []).slice().sort((a, b) => b.d.localeCompare(a.d));
      if (!pesos.length) {
        pList.innerHTML = '<div class="glass empty" style="padding:14px;text-align:center;color:var(--soft)">Nenhum peso registrado ainda.</div>';
      } else {
        pList.innerHTML = pesos.slice(0, 15).map(p => {
          const itemBmi = BmrTdeeCalculatorModel.calculateBMI(p.kg, height);
          return `
            <div class="it" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line)">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:baseline;gap:8px">
                  <b>${FormatUtils.formatNumber(p.kg, 1)} kg</b>
                  <small style="color:var(--accent);font-weight:600">IMC ${FormatUtils.formatNumber(itemBmi, 1)}</small>
                </div>
                <div style="font-size:12px;color:var(--soft)">${FormatUtils.formatDateBr(p.d)}</div>
              </div>
              <button type="button" class="btn sm dng" data-del="pesos:${p.id}" style="width:auto;flex:none;padding:4px 10px;height:32px">Excluir</button>
            </div>
          `;
        }).join('');
      }
    }
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

  // --- GESTÃO E CÁLCULO DE TREINOS SEMANAIS ---

  planoDia(d) {
    const diaSem = new Date(d + 'T12:00').getDay();
    const e = (this._state.semana || [])[diaSem] || { t: 'des' };
    if (e.t === 'f' && this._state.fichas && this._state.fichas[e.id]) {
      const f = this._state.fichas[e.id];
      return { ...e, n: 'Academia · ' + f.nome, ic: 'dumb', kcal: this.kcalDe(f.met, e.min) };
    }
    if (e.t === 'a' && this._state.atividades) {
      const a = this._state.atividades.find(x => x.id === e.id);
      if (a) return { ...e, n: a.nome, ic: a.ic || 'walk', kcal: this.kcalDe(a.met, e.min) };
    }
    return { t: 'des', n: 'Descanso', ic: 'rest', kcal: 0 };
  }

  kcalDe(met, min) {
    const peso = this._workout.getCurrentWeight();
    return Math.round((met || 3.5) * peso * (min || 45) / 60);
  }

  treinoFeito(d) {
    return (this._state.treinos || []).some(t => t.d === d);
  }

  goKey(p) {
    return p.t === 'des' ? '' : p.t + ':' + p.id;
  }

  getIcoSvg(ic, size = 18) {
    switch (ic) {
      case 'dumb':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>`;
      case 'run':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="m4 17 5-3 3 3 5-2"/><path d="M14 14V9l-3 2-4-2"/></svg>`;
      case 'walk':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="m9 20 3-6 2 3 3-1"/><path d="m6 17 4-5 1 2"/></svg>`;
      case 'bike':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;
      case 'check':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
      case 'calendar':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
      default:
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    }
  }

  renderPlano() {
    const tPlano = document.querySelector('#tPlano');
    if (!tPlano) return;

    const hoje = new Date(this._today + 'T12:00');
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));

    const dias = Array.from({ length: 7 }, (_, i) => {
      const x = new Date(seg);
      x.setDate(seg.getDate() + i);
      return x.toISOString().slice(0, 10);
    });

    const nome = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const P = dias.map(d => this.planoDia(d));
    const pt = this.planoDia(this._today);
    const okT = this.treinoFeito(this._today);

    const tTr = P.reduce((a, p) => a + p.kcal, 0);
    const tMin = P.reduce((a, p) => a + (p.min || 0), 0);

    const metabolic = this._workout.getMetabolicSummary();
    const deficitDiario = Math.max(0, metabolic.tdee - metabolic.targetKcal);
    const dDieta = deficitDiario * 7;
    const kgEstimado = (dDieta + tTr) / 7700;

    tPlano.innerHTML = `
      <div class="sec-h" style="margin-top:8px">
        <b>Sua semana de treinos</b>
        <button class="link" data-act="semana">Editar semana</button>
      </div>

      <div class="glass" style="margin-bottom:12px">
        <div class="week">
          ${dias.map((d, i) => {
            const p = P[i];
            const f = this.treinoFeito(d);
            const isHoje = d === this._today;
            const cls = `wd${isHoje ? ' hoje' : ''}${p.t === 'des' ? ' des' : ''}${f ? ' ok' : ''}`;
            const icSvg = f ? this.getIcoSvg('check', 16) : this.getIcoSvg(p.ic, 16);
            return `
              <div class="${cls}" title="${FormatUtils.escapeHtml(p.n)}">
                <span>${nome[new Date(d + 'T12:00').getDay()]}</span>
                <span class="ic t-fire">${icSvg}</span>
                <b class="num">${p.kcal ? FormatUtils.formatNumber(p.kcal) : '—'}</b>
              </div>
            `;
          }).join('')}
        </div>

        <div class="foot">
          <span class="stat"><span class="ic t-fire">${this.getIcoSvg(pt.ic, 18)}</span></span>
          <div class="t">
            <b>Hoje · ${FormatUtils.escapeHtml(pt.n)}</b>
            <small class="num">${pt.t === 'des' ? 'Recupere: sono e hidratação em dia' : pt.min + ' min · ~' + FormatUtils.formatNumber(pt.kcal) + ' kcal'}</small>
          </div>
          ${okT ? '<span class="badge ok" style="padding:4px 8px;border-radius:8px;font-size:12px">Concluído</span>' : pt.t === 'des' ? '' : `<button class="btn pri sm" style="width:auto;padding:0 16px" data-go="${this.goKey(pt)}">Começar</button>`}
        </div>

        <div class="foot">
          <span class="stat"><span class="ic t-acc">${this.getIcoSvg('calendar', 18)}</span></span>
          <div class="t">
            <b>Total planejado</b>
            <small class="num">${FormatUtils.formatNumber(tMin)} min de treino na semana</small>
          </div>
          <b class="num" style="color:var(--accent)">~${FormatUtils.formatNumber(tTr)} kcal</b>
        </div>
      </div>

      <div class="sec-h"><b>Projeção Semanal de Resultados</b></div>
      <div class="glass pad" style="margin-bottom:12px">
        <div class="mini" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin:0">
          <div><small style="color:var(--soft)">Déficit Dieta</small><b class="num" style="display:block;font-size:16px;margin-top:2px">−${FormatUtils.formatNumber(dDieta)} kcal</b></div>
          <div><small style="color:var(--soft)">Gasto Treinos</small><b class="num" style="display:block;font-size:16px;margin-top:2px">−${FormatUtils.formatNumber(tTr)} kcal</b></div>
          <div><small style="color:var(--soft)">Perda Estimada</small><b class="num" style="display:block;font-size:16px;margin-top:2px;color:var(--accent)">~${FormatUtils.formatNumber(kgEstimado, 2)} kg</b></div>
        </div>
        <p class="note" style="margin:10px 2px 0">
          Estimativa baseada em 7.700 kcal ≈ 1 kg de gordura corporal. O déficit da dieta isolado projeta ~${FormatUtils.formatNumber(dDieta / 7700, 2)} kg/semana.
        </p>
      </div>
    `;
  }

  renderFichas() {
    const tFichas = document.querySelector('#tFichas');
    if (!tFichas) return;

    const fichas = Object.entries(this._state.fichas || {});
    if (!fichas.length) {
      tFichas.innerHTML = `
        <div class="sec-h" style="margin-top:8px">
          <b>0 fichas</b>
          <button class="link" data-act="novaficha">+ Criar ficha</button>
        </div>
        <div class="glass empty" style="padding:16px;text-align:center;color:var(--soft)">
          Nenhuma ficha de musculação cadastrada ainda. Toque em "+ Criar ficha" para montar seu treino.
        </div>
      `;
      return;
    }

    tFichas.innerHTML = `
      <div class="sec-h" style="margin-top:8px">
        <b>${fichas.length} fichas cadastradas</b>
        <button class="link" data-act="novaficha">+ Nova ficha</button>
      </div>

      ${fichas.map(([k, F]) => {
        const kcalEst = this.kcalDe(F.met, F.min);
        return `
          <details class="glass acc" style="margin-bottom:10px">
            <summary style="display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer">
              <span class="stat"><span class="ic t-fire">${this.getIcoSvg('dumb', 18)}</span></span>
              <div class="t" style="flex:1">
                <b>${FormatUtils.escapeHtml(F.nome)}</b>
                <small class="num" style="color:var(--soft);display:block;font-size:12px">
                  ${F.ex.length} exercícios · ${F.min} min · ~${FormatUtils.formatNumber(kcalEst)} kcal
                </small>
              </div>
              <span class="ms chev" aria-hidden="true">expand_more</span>
            </summary>
            <div class="bd" style="padding:10px 14px 14px;border-top:1px solid var(--line)">
              ${F.ex.map(e => `
                <div class="xr" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px">
                  <div>
                    <b>${FormatUtils.escapeHtml(e.n)}</b>
                    ${this._state.cargas && this._state.cargas[e.n] ? `<div style="color:var(--accent);font-size:11px">Última carga: ${FormatUtils.formatNumber(this._state.cargas[e.n], 1)} kg</div>` : ''}
                  </div>
                  <span class="num" style="color:var(--soft)">${FormatUtils.escapeHtml(e.sr)}</span>
                </div>
              `).join('')}
              <div style="display:flex;gap:10px;margin-top:12px">
                <button class="btn pri sm flex1" data-go="f:${k}">Começar treino</button>
                <button class="btn sec sm" data-edf="${k}">Editar ficha</button>
              </div>
            </div>
          </details>
        `;
      }).join('')}
      <p class="note" style="margin-top:8px">
        Ao realizar cada série, anote a carga levantada. O app salva automaticamente seu histórico e calcula recordes.
      </p>
    `;
  }

  renderTreinoEvo() {
    const tEvo = document.querySelector('#tEvo');
    if (!tEvo) return;

    const hcarga = this._state.hcarga || {};
    const nomes = Object.keys(hcarga).filter(n => hcarga[n] && hcarga[n].length).sort((a, b) => a.localeCompare(b, 'pt'));

    if (!this._evoEx || !nomes.includes(this._evoEx)) {
      this._evoEx = nomes[0] || '';
    }

    const H = this._evoEx ? (hcarga[this._evoEx] || []) : [];
    const ini = H[0];
    const ult = H[H.length - 1];
    const gan = ini && ult ? ult.kg - ini.kg : 0;

    tEvo.innerHTML = `
      <div class="f" style="margin-top:12px">
        <label for="evSel">Exercício para evolução</label>
        <select id="evSel">
          ${nomes.length ? nomes.map(n => `<option value="${FormatUtils.escapeHtml(n)}"${n === this._evoEx ? ' selected' : ''}>${FormatUtils.escapeHtml(n)}</option>`).join('') : '<option value="">Nenhuma carga registrada ainda</option>'}
        </select>
      </div>

      ${H.length ? `
        <div class="glass pad" style="margin-top:12px">
          <div class="mini" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin:0 0 14px">
            <div><small style="color:var(--soft)">Inicial</small><b class="num" style="display:block;font-size:16px">${FormatUtils.formatNumber(ini.kg, 1)} kg</b></div>
            <div><small style="color:var(--soft)">Atual</small><b class="num" style="display:block;font-size:16px">${FormatUtils.formatNumber(ult.kg, 1)} kg</b></div>
            <div><small style="color:var(--soft)">Evolução</small><b class="num" style="display:block;font-size:16px;color:var(${gan >= 0 ? '--ok' : '--bad'})">${gan >= 0 ? '+' : ''}${FormatUtils.formatNumber(gan, 1)} kg</b></div>
          </div>
          <div class="evo" style="height:190px;position:relative"><svg id="evoSvg" style="width:100%;height:100%"></svg></div>
        </div>

        <div class="sec-h"><b>Histórico de Cargas</b><span style="color:var(--soft);font-size:13px">${H.length} registros</span></div>
        <div class="glass list">
          ${[...H].reverse().slice(0, 8).map((h, i, a) => {
            const p = a[i + 1];
            const df = p ? h.kg - p.kg : 0;
            return `
              <div class="it" style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line)">
                <div class="t">
                  <b class="num">${FormatUtils.formatNumber(h.kg, 1)} kg ${h.pr ? '<span class="tag ok" style="margin-left:6px;font-size:10px;padding:2px 6px">Recorde</span>' : ''}</b>
                  <small style="display:block;color:var(--soft);font-size:11px">${FormatUtils.formatDateBr(h.d)}</small>
                </div>
                ${p && df ? `<span class="num" style="color:var(${df > 0 ? '--ok' : '--bad'})">${df > 0 ? '+' : ''}${FormatUtils.formatNumber(df, 1)} kg</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="glass empty" style="margin-top:12px;padding:16px;text-align:center;color:var(--soft)">
          Ao concluir um treino de ficha, anote a carga de cada exercício. Sua progressão de força aparecerá aqui em gráficos e marcos.
        </div>
      `}
    `;

    const evSel = document.querySelector('#evSel');
    if (evSel) {
      evSel.onchange = () => {
        this._evoEx = evSel.value;
        this.renderTreinoEvo();
      };
    }

    if (H.length) {
      setTimeout(() => this.drawEvo(), 50);
    }
  }

  drawEvo() {
    const s = document.querySelector('#evoSvg');
    if (!s) return;
    const W = s.clientWidth || 320;
    const Hh = s.clientHeight || 190;

    const H = (this._state.hcarga || {})[this._evoEx] || [];
    if (!H.length) return;

    const ks = H.map(h => h.kg);
    const lo = Math.floor(Math.min(...ks) * 0.9);
    const hi = Math.ceil(Math.max(...ks) * 1.08) || 1;

    const L = 34, R = 10, T = 14, B = 22, n = H.length;
    const X = i => n === 1 ? (L + W - R) / 2 : L + i / (n - 1) * (W - L - R);
    const Y = k => T + (hi - k) / ((hi - lo) || 1) * (Hh - T - B);

    const pts = H.map((h, i) => [X(i), Y(h.kg)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const ticks = [lo, Math.round((lo + hi) / 2), hi];

    s.innerHTML = `
      <defs>
        <linearGradient id="geSmart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--accent, #6FCF97)" stop-opacity=".35"/>
          <stop offset="1" stop-color="var(--accent, #6FCF97)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line, rgba(255,255,255,0.08))"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end" fill="var(--faint, #888)" font-size="11">${t}</text>`).join('')}
      ${n > 1 ? `<path d="${line} L${pts[n - 1][0]} ${Hh - B} L${pts[0][0]} ${Hh - B} Z" fill="url(#geSmart)"/>` : ''}
      <path d="${line}" fill="none" stroke="var(--accent, #6FCF97)" stroke-width="2.5" stroke-linejoin="round"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent, #6FCF97)" stroke="#fff" stroke-width="1.5"/>`).join('')}
      <text x="${L}" y="${Hh - 4}" fill="var(--faint, #888)" font-size="11">${FormatUtils.formatDateBr(H[0].d).slice(0, 5)}</text>
      ${n > 1 ? `<text x="${W - R}" y="${Hh - 4}" text-anchor="end" fill="var(--faint, #888)" font-size="11">${FormatUtils.formatDateBr(H[n - 1].d).slice(0, 5)}</text>` : ''}
    `;
  }

  renderMapa() {
    const tMapa = document.querySelector('#tMapa');
    if (!tMapa || !BODY) return;

    const B = BODY[this._mapV] || BODY.front;
    const sel = B.m.find(m => m.id === this._mapSel);

    const fg = new Set(this._mapF && this._state.fichas && this._state.fichas[this._mapF] ? this._state.fichas[this._mapF].ex.map(e => {
      const x = (this._state.exercicios || []).find(it => it.nome === e.n);
      return x ? x.g : null;
    }).filter(Boolean) : []);

    const W = 361.156, H = 541.867;
    let pill = '';
    if (sel) {
      const tw = sel.pt.length * 7.4 + 22;
      const x = Math.min(W - tw / 2 - 4, Math.max(tw / 2 + 4, sel.a[0]));
      const y = sel.a[1] - 30;
      pill = `<g class="pill"><rect x="${x - tw / 2}" y="${y - 13}" width="${tw}" height="24" rx="12" fill="var(--surface-2, #202824)" stroke="var(--accent, #6FCF97)"/><text x="${x}" y="${y + 4}" fill="#fff" font-size="12" text-anchor="middle" font-weight="600">${FormatUtils.escapeHtml(sel.pt)}</text></g>`;
    }

    const exs = sel ? (this._state.exercicios || []).filter(x => x.g === sel.g).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')) : [];

    tMapa.innerHTML = `
      <div class="two" style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="f">
          <label>Vista anatômica</label>
          <div class="segc" data-for="mapVLocal" role="group">
            <button type="button" data-v="front" class="${this._mapV === 'front' ? 'on' : ''}" aria-pressed="${this._mapV === 'front'}">Frente</button>
            <button type="button" data-v="back" class="${this._mapV === 'back' ? 'on' : ''}" aria-pressed="${this._mapV === 'back'}">Costas</button>
          </div>
        </div>
        <div class="f">
          <label for="mF">Destacar ficha</label>
          <select id="mF">
            <option value="">Nenhuma</option>
            ${Object.entries(this._state.fichas || {}).map(([k, f]) => `<option value="${k}"${k === this._mapF ? ' selected' : ''}>${FormatUtils.escapeHtml(f.nome)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="f" style="margin-top:12px">
        <label for="mS">Músculo</label>
        <select id="mS">
          <option value="">Selecione ou toque no desenho…</option>
          ${B.m.map((m, i) => `<option value="${m.id}"${m.id === this._mapSel ? ' selected' : ''}>${i + 1}. ${FormatUtils.escapeHtml(m.pt)}</option>`).join('')}
        </select>
      </div>

      <div class="glass pad" style="margin-top:12px;display:flex;flex-direction:column;align-items:center">
        <div class="body" style="max-width:320px;width:100%">
          <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa muscular anatômico" style="width:100%;height:auto;cursor:pointer">
            <image class="lt" href="${B.img.light}" width="${W}" height="${H}"/>
            <image class="dk" href="${B.img.dark}" width="${W}" height="${H}"/>
            ${B.m.map(m => `
              <path data-m="${m.id}" d="${m.d}" transform="translate(${m.t[0]} ${m.t[1]})" class="${m.id === this._mapSel ? 'on' : fg.has(m.g) ? 'fic' : ''}" fill="${m.id === this._mapSel ? 'var(--accent, #6FCF97)' : fg.has(m.g) ? 'rgba(230,126,34,0.4)' : 'transparent'}" stroke="${m.id === this._mapSel ? '#fff' : 'none'}">
                <title>${FormatUtils.escapeHtml(m.pt)}</title>
              </path>
            `).join('')}
            ${B.m.map((m, i) => `
              <g class="mk${m.id === this._mapSel ? ' on' : ''}" data-m="${m.id}">
                <circle cx="${m.a[0]}" cy="${m.a[1]}" r="10" fill="${m.id === this._mapSel ? 'var(--accent, #6FCF97)' : 'rgba(0,0,0,0.6)'}" stroke="#fff" stroke-width="1"/>
                <text x="${m.a[0]}" y="${m.a[1] + 4}" fill="#fff" font-size="10" text-anchor="middle">${i + 1}</text>
              </g>
            `).join('')}
            ${pill}
          </svg>
        </div>
        ${this._mapF ? `<p class="note" style="text-align:center;margin-top:6px"><span style="color:#E67E22;font-weight:600">Laranja</span>: músculos trabalhados na ficha selecionada</p>` : ''}
      </div>

      <div class="sec-h"><b>Músculos · ${this._mapV === 'front' ? 'Frente' : 'Costas'}</b></div>
      <div class="glass leg" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:8px;padding:12px;margin-bottom:12px">
        ${B.m.map((m, i) => `
          <div class="${m.id === this._mapSel ? 'on' : ''}" data-m="${m.id}" style="cursor:pointer;padding:6px;border-radius:8px;background:${m.id === this._mapSel ? 'var(--accent-soft, rgba(111,207,151,0.15))' : 'transparent'};font-size:12px">
            <i style="font-weight:700;color:var(--accent);margin-right:4px">${i + 1}.</i>
            <span>${FormatUtils.escapeHtml(m.pt)}</span>
          </div>
        `).join('')}
      </div>

      ${sel ? `
        <div class="sec-h">
          <b>Exercícios para ${FormatUtils.escapeHtml(sel.g)}</b>
          <button class="link" data-add="treino">+ Cadastrar exercício</button>
        </div>
        <div class="glass list" style="margin-bottom:14px">
          ${exs.length ? exs.map(x => `
            <div class="it" style="padding:10px 14px;border-bottom:1px solid var(--line)">
              <b>${FormatUtils.escapeHtml(x.nome)}</b>
              <small style="display:block;color:var(--soft);font-size:12px">${FormatUtils.escapeHtml(x.sr || '3 × 12')}</small>
            </div>
          `).join('') : '<div class="glass empty" style="padding:14px;text-align:center;color:var(--soft)">Nenhum exercício cadastrado para este grupo.</div>'}
        </div>
      ` : ''}
    `;

    // Listeners do Mapa
    const mF = document.querySelector('#mF');
    if (mF) {
      mF.onchange = () => {
        this._mapF = mF.value;
        this.renderMapa();
      };
    }

    const mS = document.querySelector('#mS');
    if (mS) {
      mS.onchange = () => {
        this._mapSel = mS.value;
        this.renderMapa();
      };
    }

    const segBtns = tMapa.querySelectorAll('.segc[data-for="mapVLocal"] button');
    segBtns.forEach(btn => {
      btn.onclick = () => {
        this._mapV = btn.dataset.v;
        this.renderMapa();
      };
    });
  }

  // --- MODAIS E EXECUTORES DE TREINO ---

  handleStartWorkout(goKey) {
    if (!goKey) return;
    const [t, id] = goKey.split(':');
    const pt = this.planoDia(this._today);
    const min = (pt.t === t && pt.id === id) ? pt.min : 0;
    if (t === 'f') {
      this.sheetFicha(id, min);
    } else {
      this.showAddWorkoutSheet(id);
    }
  }

  sheetSemana() {
    const nome = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const ord = [1, 2, 3, 4, 5, 6, 0];
    const sem = this._state.semana || [];

    const optsPlano = (e) => {
      const v = e.t === 'des' ? 'des' : e.t + ':' + e.id;
      return `
        <option value="des"${v === 'des' ? ' selected' : ''}>Descanso</option>
        <optgroup label="Fichas de musculação">
          ${Object.entries(this._state.fichas || {}).map(([k, f]) => `<option value="f:${k}"${v === 'f:' + k ? ' selected' : ''}>${FormatUtils.escapeHtml(f.nome)}</option>`).join('')}
        </optgroup>
        <optgroup label="Atividades físicas">
          ${(this._state.atividades || []).map(a => `<option value="a:${a.id}"${v === 'a:' + a.id ? ' selected' : ''}>${FormatUtils.escapeHtml(a.nome)}</option>`).join('')}
        </optgroup>
      `;
    };

    this._sheet.open(`
      <h3 id="shT">Planejar Semana de Treinos</h3>
      <form class="form" id="frmSemana">
        ${ord.map(g => {
          const e = sem[g] || { t: 'des' };
          return `
            <div class="exr" style="display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:8px;margin-bottom:8px">
              <div class="f">
                <label for="sd${g}">${nome[g]}</label>
                <select id="sd${g}">${optsPlano(e)}</select>
              </div>
              <div class="f">
                <label for="sm${g}">Minutos</label>
                <input id="sm${g}" type="number" inputmode="numeric" min="5" max="300" value="${e.min || (e.t === 'a' ? 30 : 50)}">
              </div>
            </div>
          `;
        }).join('')}
        <button class="btn pri" style="margin-top:14px">Salvar Plano Semanal</button>
      </form>
    `);

    const frm = document.querySelector('#frmSemana');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const novaSem = [0, 1, 2, 3, 4, 5, 6].map(g => {
          const v = document.querySelector('#sd' + g).value;
          const min = parseInt(document.querySelector('#sm' + g).value, 10) || 0;
          if (v === 'des') return { t: 'des' };
          const [t, id] = v.split(':');
          return { t, id, min };
        });
        this._state.semana = novaSem;
        this.save();
        this._sheet.close();
        this.renderPlano();
        this._toast.show('Plano da semana atualizado com sucesso.');
      };
    }
  }

  sheetFicha(k, minP) {
    const F = (this._state.fichas || {})[k];
    if (!F) return;

    this._sheet.open(`
      <h3 id="shT">${FormatUtils.escapeHtml(F.nome)}</h3>
      
      <div class="rest glass" id="restBox" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:12px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="ms" aria-hidden="true">timer</span>
          <div>
            <small style="color:var(--soft);display:block;font-size:11px">Descanso</small>
            <b class="num" id="rTVal" style="font-size:16px">01:30</b>
          </div>
        </div>
        <select id="rSelTime" style="padding:4px 8px;border-radius:8px">
          <option value="45">00:45</option>
          <option value="60">01:00</option>
          <option value="90" selected>01:30</option>
          <option value="120">02:00</option>
          <option value="180">03:00</option>
        </select>
        <button type="button" class="btn pri sm" id="rGoTimer" style="width:auto;padding:0 12px">Iniciar</button>
      </div>

      <div id="xExList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        ${F.ex.map((e, i) => `
          <div class="ex glass" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px">
            <button type="button" class="ck" data-ck="${i}" aria-pressed="false" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:none;cursor:pointer;display:grid;place-items:center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <div style="flex:1">
              <b>${FormatUtils.escapeHtml(e.n)}</b>
              <small style="display:block;color:var(--soft);font-size:11px">${FormatUtils.escapeHtml(e.sr)}</small>
            </div>
            <input type="number" step="0.5" inputmode="decimal" placeholder="kg" style="width:70px;text-align:center" data-i="${i}" value="${(this._state.cargas && this._state.cargas[e.n]) || ''}">
          </div>
        `).join('')}
      </div>

      <form class="form" id="frmFinishFicha">
        <div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="f">
            <label>Duração (minutos)</label>
            <input id="xMinFicha" type="number" inputmode="numeric" min="5" max="300" value="${minP || F.min || 50}" required>
          </div>
          <div class="f">
            <label>Gasto estimado</label>
            <div class="num" id="xEstFicha" style="height:44px;display:flex;align-items:center;font-size:16px;color:var(--accent);font-weight:700">~0 kcal</div>
          </div>
        </div>
        <button class="btn pri" style="margin-top:14px">Concluir Treino</button>
      </form>
    `);

    // Timer e Cálculos do Treino
    const minInput = document.querySelector('#xMinFicha');
    const estEl = document.querySelector('#xEstFicha');
    const updateEst = () => {
      const min = parseInt(minInput ? minInput.value : 50, 10) || 50;
      const k = this.kcalDe(F.met, min);
      if (estEl) estEl.textContent = `~${FormatUtils.formatNumber(k)} kcal`;
    };
    if (minInput) minInput.oninput = updateEst;
    updateEst();

    // Toggle de séries concluídas
    const ckBtns = document.querySelectorAll('.ck[data-ck]');
    ckBtns.forEach(btn => {
      btn.onclick = () => {
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', on);
        btn.style.background = on ? 'var(--accent, #6FCF97)' : 'none';
        btn.style.color = on ? '#000' : 'inherit';
        if (on) this.startRestTimer();
      };
    });

    const rGoBtn = document.querySelector('#rGoTimer');
    if (rGoBtn) {
      rGoBtn.onclick = () => {
        if (this._restInterval) this.stopRestTimer();
        else this.startRestTimer();
      };
    }

    const frm = document.querySelector('#frmFinishFicha');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const min = parseInt(document.querySelector('#xMinFicha').value, 10) || 50;
        const estKcal = this.kcalDe(F.met, min);

        this._state.cargas = this._state.cargas || {};
        this._state.hcarga = this._state.hcarga || {};
        const prs = [];

        document.querySelectorAll('#xExList input[data-i]').forEach(inp => {
          const val = parseFloat(inp.value.replace(',', '.'));
          if (val > 0) {
            const exNome = F.ex[inp.dataset.i].n;
            const historico = (this._state.hcarga[exNome] || []).filter(h => h.d !== this._today);
            const recordeAnterior = historico.length ? Math.max(...historico.map(h => h.kg)) : 0;
            const isPr = historico.length && val > recordeAnterior;

            if (isPr) {
              prs.push({ nome: exNome, kg: val, diff: val - recordeAnterior });
            }

            this._state.cargas[exNome] = val;
            historico.push({ d: this._today, kg: val, pr: isPr ? 1 : 0 });
            historico.sort((a, b) => a.d.localeCompare(b.d));
            this._state.hcarga[exNome] = historico;
          }
        });

        this.stopRestTimer();
        this._state.treinos = this._state.treinos || [];
        this._state.treinos.push({
          id: FormatUtils.uid(),
          d: this._today,
          tipo: `${F.nome}`,
          ic: 'dumb',
          min,
          kcal: estKcal
        });

        this.save();
        this._sheet.close();
        this.renderAll();

        if (prs.length) {
          this._sheet.open(`
            <div style="text-align:center;padding:10px 0">
              <h3 style="margin:8px 0;color:var(--accent)">Novo Recorde Pessoal!</h3>
              <p style="font-size:14px;color:var(--soft)">Parabéns pela dedicação! Você superou sua melhor carga:</p>
              <div class="glass list" style="margin:14px 0">
                ${prs.map(p => `
                  <div class="it" style="display:flex;justify-content:space-between;padding:10px 14px">
                    <b>${FormatUtils.escapeHtml(p.nome)}</b>
                    <span class="num" style="color:var(--accent)"><b>${FormatUtils.formatNumber(p.kg, 1)} kg</b> (+${FormatUtils.formatNumber(p.diff, 1)} kg)</span>
                  </div>
                `).join('')}
              </div>
              <button class="btn pri" id="bOkPr">Continuar</button>
            </div>
          `);
          const bOkPr = document.querySelector('#bOkPr');
          if (bOkPr) bOkPr.onclick = () => this._sheet.close();
        } else {
          this._toast.show('Treino concluído e registrado no histórico.');
        }
      };
    }
  }

  startRestTimer() {
    const rSel = document.querySelector('#rSelTime');
    const segs = parseInt(rSel ? rSel.value : 90, 10) || 90;
    this._restEnd = Date.now() + segs * 1000;
    const rGo = document.querySelector('#rGoTimer');
    if (rGo) rGo.textContent = 'Parar';

    if (this._restInterval) clearInterval(this._restInterval);
    this._restInterval = setInterval(() => this.tickRestTimer(), 500);
    this.tickRestTimer();
  }

  tickRestTimer() {
    const el = document.querySelector('#rTVal');
    if (!el) {
      this.stopRestTimer();
      return;
    }
    const left = Math.max(0, Math.round((this._restEnd - Date.now()) / 1000));
    const m = Math.floor(left / 60);
    const s = left % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (!left) {
      this.stopRestTimer();
      WebAudioAdapter.playPinSuccess();
      el.textContent = 'Bora!';
      this._toast.show('Descanso finalizado! Inicie a próxima série.');
    }
  }

  stopRestTimer() {
    if (this._restInterval) {
      clearInterval(this._restInterval);
      this._restInterval = null;
    }
    const rGo = document.querySelector('#rGoTimer');
    if (rGo) rGo.textContent = 'Iniciar';
  }

  sheetEditFicha(k) {
    const isNew = !k;
    const F = isNew ? { nome: 'Nova Ficha', min: 50, met: 3.5, ex: [{ n: 'Supino reto', sr: '3 × 12' }] } : structuredClone(this._state.fichas[k]);
    if (!F) return;

    this._sheet.open(`
      <h3 id="shT">${isNew ? 'Criar Nova Ficha' : 'Editar Ficha'}</h3>
      <form class="form" id="frmEditFicha">
        <div class="f">
          <label>Nome da ficha</label>
          <input id="fNomeFicha" value="${FormatUtils.escapeHtml(F.nome)}" required>
        </div>
        <div class="two" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="f">
            <label>Duração padrão (min)</label>
            <input id="fMinFicha" type="number" min="10" max="180" value="${F.min || 50}" required>
          </div>
          <div class="f">
            <label>Intensidade</label>
            <select id="fMetFicha">
              <option value="3" ${F.met === 3 ? 'selected' : ''}>Leve (3.0 MET)</option>
              <option value="3.5" ${F.met === 3.5 ? 'selected' : ''}>Moderada (3.5 MET)</option>
              <option value="5" ${F.met === 5 ? 'selected' : ''}>Intensa (5.0 MET)</option>
              <option value="6" ${F.met === 6 ? 'selected' : ''}>Muito Intensa (6.0 MET)</option>
            </select>
          </div>
        </div>
        
        <div class="sec-h" style="margin-top:12px"><b>Exercícios da Ficha</b></div>
        <div id="fichaExList" style="display:flex;flex-direction:column;gap:8px">
          ${F.ex.map((e, idx) => `
            <div class="ex-row glass" style="display:grid;grid-template-columns:minmax(0,1fr) 90px 32px;gap:8px;padding:8px 10px;border-radius:10px;align-items:center">
              <input type="text" class="ex-n" value="${FormatUtils.escapeHtml(e.n)}" placeholder="Nome do exercício" required>
              <input type="text" class="ex-sr" value="${FormatUtils.escapeHtml(e.sr)}" placeholder="3 × 12">
              <button type="button" class="btn sm dng rm-ex" data-rm="${idx}" style="padding:0;height:32px;width:32px">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn sec sm" id="bAddExToFicha" style="margin-top:8px">+ Adicionar Exercício</button>

        <div style="display:flex;gap:10px;margin-top:16px">
          <button class="btn pri flex1">Salvar Ficha</button>
          ${!isNew ? `<button type="button" class="btn dng sm" id="bDelFicha">Excluir</button>` : ''}
        </div>
      </form>
    `);

    const listEl = document.querySelector('#fichaExList');
    const addBtn = document.querySelector('#bAddExToFicha');
    if (addBtn && listEl) {
      addBtn.onclick = () => {
        const div = document.createElement('div');
        div.className = 'ex-row glass';
        div.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) 90px 32px;gap:8px;padding:8px 10px;border-radius:10px;align-items:center';
        div.innerHTML = `
          <input type="text" class="ex-n" placeholder="Nome do exercício" required>
          <input type="text" class="ex-sr" value="3 × 12" placeholder="3 × 12">
          <button type="button" class="btn sm dng rm-ex" style="padding:0;height:32px;width:32px">×</button>
        `;
        listEl.appendChild(div);
        div.querySelector('.rm-ex').onclick = () => div.remove();
      };
    }

    document.querySelectorAll('.rm-ex').forEach(btn => {
      btn.onclick = () => btn.closest('.ex-row').remove();
    });

    const delBtn = document.querySelector('#bDelFicha');
    if (delBtn) {
      delBtn.onclick = () => {
        delete this._state.fichas[k];
        this.save();
        this._sheet.close();
        this.renderAll();
        this._toast.show('Ficha excluída.');
      };
    }

    const frm = document.querySelector('#frmEditFicha');
    if (frm) {
      frm.onsubmit = e => {
        e.preventDefault();
        const nome = document.querySelector('#fNomeFicha').value.trim();
        const min = parseInt(document.querySelector('#fMinFicha').value, 10) || 50;
        const met = parseFloat(document.querySelector('#fMetFicha').value) || 3.5;

        const exs = [];
        document.querySelectorAll('.ex-row').forEach(row => {
          const n = row.querySelector('.ex-n').value.trim();
          const sr = row.querySelector('.ex-sr').value.trim() || '3 × 12';
          if (n) exs.push({ n, sr });
        });

        if (!exs.length) {
          this._toast.show('Adicione ao menos um exercício na ficha.');
          return;
        }

        this._state.fichas = this._state.fichas || {};
        const id = isNew ? FormatUtils.uid() : k;
        this._state.fichas[id] = { nome, min, met, ex: exs };
        this.save();
        this._sheet.close();
        this.renderAll();
        this._toast.show('Ficha salva com sucesso.');
      };
    }
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
