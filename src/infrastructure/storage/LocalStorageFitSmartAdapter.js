import { IFitSmartStoragePort } from '../../domain/ports/IFitSmartStoragePort.js';
import { FormatUtils } from '../../domain/utils/FormatUtils.js';
import { FOOD_DATABASE } from '../../domain/catalogs/FoodCatalog.js';
import { ACTIVITIES_DATABASE } from '../../domain/catalogs/ActivityCatalog.js';
import { EXS } from '../../domain/catalogs/WorkoutCatalog.js';

/**
 * Adaptador Canônico de Armazenamento Local-First do Fit Smart
 * Implementa IFitSmartStoragePort
 */
export class LocalStorageFitSmartAdapter extends IFitSmartStoragePort {
  constructor(storageKey = 'fit-systekna-v1') {
    super();
    this._storageKey = storageKey;
  }

  loadState() {
    let state = null;
    let hadKey = false;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this._storageKey);
        if (raw) {
          state = JSON.parse(raw);
          hadKey = true;
        }
      }
    } catch (e) {
      console.warn('[LocalStorageFitSmartAdapter] Falha ao ler localStorage:', e);
    }

    if (!state) {
      state = this._createDefaultState();
    }

    this._applyMigrations(state, hadKey);
    return state;
  }

  saveState(state) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this._storageKey, JSON.stringify(state));
      }
      return true;
    } catch (e) {
      console.error('[LocalStorageFitSmartAdapter] Erro ao persistir estado:', e);
      return false;
    }
  }

  _createDefaultState() {
    const today = FormatUtils.getTodayIso();
    const mkExList = list => list.map(([n, sr]) => ({ n, sr }));

    return {
      perfil: {
        nome: '',
        alt: 170,
        nasc: '',
        ini: 80,
        meta: 75,
        sexo: 'm',
        ativ: 1.2,
        ritmo: 0.5,
        agua: 8
      },
      pesos: [],
      comidas: [],
      treinos: [],
      agua: {},
      cargas: {},
      inicio: today,
      mode: 'light',
      alimentos: FOOD_DATABASE.map((f, i) => ({ id: 'a' + i, nome: f[0], kcal: f[1] })),
      fichas: {
        A: {
          nome: 'Ficha A',
          min: 50,
          met: 3.5,
          ex: mkExList([
            ['Aquecimento: bicicleta ou esteira', '10 min'],
            ['Leg press 45°', '3 × 12'],
            ['Supino reto na máquina', '3 × 12'],
            ['Puxada frontal', '3 × 12'],
            ['Cadeira extensora', '3 × 12'],
            ['Remada sentada', '3 × 12'],
            ['Prancha abdominal', '3 × 30 s']
          ])
        },
        B: {
          nome: 'Ficha B',
          min: 50,
          met: 3.5,
          ex: mkExList([
            ['Aquecimento: bicicleta ou esteira', '10 min'],
            ['Agachamento no Smith', '3 × 10'],
            ['Mesa flexora', '3 × 12'],
            ['Desenvolvimento na máquina', '3 × 12'],
            ['Peck deck (voador)', '3 × 12'],
            ['Rosca direta', '3 × 12'],
            ['Tríceps na polia', '3 × 12'],
            ['Abdominal na máquina', '3 × 15']
          ])
        }
      },
      exercicios: EXS.map((e, i) => ({ id: 'e' + i, g: e[0], nome: e[1], sr: e[2] || '3 × 12' })),
      atividades: ACTIVITIES_DATABASE.map(a => ({ id: a[0], nome: a[1], met: a[2], ic: a[3] })),
      semana: [
        { t: 'des' },
        { t: 'f', id: 'A', min: 50 },
        { t: 'a', id: 'cam', min: 30 },
        { t: 'f', id: 'B', min: 50 },
        { t: 'a', id: 'cam', min: 30 },
        { t: 'f', id: 'A', min: 50 },
        { t: 'a', id: 'cam', min: 45 }
      ]
    };
  }

  _applyMigrations(state, hadKey = false) {
    if (state.onb === undefined) state.onb = hadKey;

    state.perfil = state.perfil || {};
    state.perfil.alt = state.perfil.alt || 170;
    state.perfil.ini = state.perfil.ini || 80;
    state.perfil.meta = state.perfil.meta || 75;
    state.perfil.sexo = state.perfil.sexo || 'm';
    state.perfil.ativ = state.perfil.ativ || 1.2;
    state.perfil.ritmo = state.perfil.ritmo || 0.5;
    state.perfil.agua = state.perfil.agua || 8;

    state.pesos = state.pesos || [];
    state.comidas = state.comidas || [];
    state.treinos = state.treinos || [];
    state.agua = state.agua || {};
    state.cargas = state.cargas || {};
    state.hcarga = state.hcarga || {};
    ['medidas', 'pressao', 'exames', 'sono', 'favs'].forEach(k => {
      if (!state[k]) state[k] = [];
    });

    if (!state.alimentos || !state.alimentos.length) {
      state.alimentos = FOOD_DATABASE.map((f, i) => ({ id: 'a' + i, nome: f[0], kcal: f[1] }));
    }

    if (!state.atividades || !state.atividades.length) {
      state.atividades = ACTIVITIES_DATABASE.map(a => ({ id: a[0], nome: a[1], met: a[2], ic: a[3] }));
    }

    if (!state.exercicios || !state.exercicios.length) {
      state.exercicios = EXS.map((e, i) => ({ id: 'e' + i, g: e[0], nome: e[1], sr: e[2] || '3 × 12' }));
    }

    if (state.semana && typeof state.semana[0] === 'string') {
      state.semana = state.semana.map(x =>
        x === 'des'
          ? { t: 'des' }
          : x === 'cam'
          ? { t: 'a', id: 'cam', min: 30 }
          : x === 'caml'
          ? { t: 'a', id: 'cam', min: 45 }
          : { t: 'f', id: x, min: 50 }
      );
    }

    [['Antebraço', 'Rosca de punho'], ['Antebraço', 'Rosca inversa']].forEach(([g, n]) => {
      if (!state.exercicios.some(x => x.nome === n)) {
        state.exercicios.push({ id: FormatUtils.generateUid(), g, nome: n, sr: '3 × 12' });
      }
    });

    if (state.fichas) {
      Object.values(state.fichas).forEach(f => {
        f.min = f.min || 50;
        f.met = f.met || 3.5;
        if (f.ex) {
          f.ex.forEach(e => {
            if (e.n && !state.exercicios.some(x => x.nome === e.n)) {
              state.exercicios.push({ id: FormatUtils.generateUid(), g: 'Outro', nome: e.n, sr: e.sr || '3 × 12' });
            }
          });
        }
      });
    }
  }
}
