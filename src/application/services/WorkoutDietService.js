import { FormatUtils } from '../../domain/utils/FormatUtils.js';
import { BmrTdeeCalculatorModel } from '../../domain/models/BmrTdeeCalculatorModel.js';
import { HydrationModel } from '../../domain/models/HydrationModel.js';

/**
 * Serviço de Aplicação: Gestão de Treinos, Dieta e Balanço Energético
 */
export class WorkoutDietService {
  constructor(storageAdapter) {
    this._storage = storageAdapter;
  }

  getState() {
    return this._storage.loadState();
  }

  saveState(state) {
    return this._storage.saveState(state);
  }

  getCurrentWeight() {
    const state = this.getState();
    const sorted = (state.pesos || []).slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    if (sorted.length) {
      return Number(sorted[sorted.length - 1].kg);
    }
    return Number(state.perfil && state.perfil.ini) || 80;
  }

  getMetabolicSummary() {
    const state = this.getState();
    const p = state.perfil || {};
    const weight = this.getCurrentWeight();
    const height = p.alt || 170;
    const isMale = p.sexo === 'm';
    const age = BmrTdeeCalculatorModel.calculateAge(p.nasc);
    const activityFactor = p.ativ || 1.2;
    const pace = p.ritmo || 0.5;

    const bmr = BmrTdeeCalculatorModel.calculateBMR(weight, height, age, isMale);
    const tdee = BmrTdeeCalculatorModel.calculateTDEE(bmr, activityFactor);
    const targetKcal = BmrTdeeCalculatorModel.calculateTargetCalories(tdee, pace, isMale);
    const bmi = BmrTdeeCalculatorModel.calculateBMI(weight, height);
    const bmiCategory = BmrTdeeCalculatorModel.classifyBMI(bmi);

    return {
      weight,
      height,
      age,
      bmr,
      tdee,
      targetKcal,
      bmi,
      bmiCategory
    };
  }

  getDailyCaloriesConsumed(dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    return (state.comidas || [])
      .filter(c => c.d === dateIso)
      .reduce((sum, item) => sum + (Number(item.kcal) || 0), 0);
  }

  getDailyCaloriesBurned(dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    return (state.treinos || [])
      .filter(t => t.d === dateIso)
      .reduce((sum, item) => sum + (Number(item.kcal) || 0), 0);
  }

  getDailyEnergyBalance(dateIso = FormatUtils.getTodayIso()) {
    const summary = this.getMetabolicSummary();
    const consumed = this.getDailyCaloriesConsumed(dateIso);
    const burned = this.getDailyCaloriesBurned(dateIso);
    const remaining = summary.targetKcal + burned - consumed;

    return {
      targetKcal: summary.targetKcal,
      consumedKcal: consumed,
      burnedKcal: burned,
      remainingKcal: remaining
    };
  }

  addMeal(mealName, kcal, mealCategory, dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    const entry = {
      id: FormatUtils.generateUid(),
      n: String(mealName).trim(),
      kcal: Math.round(Number(kcal) || 0),
      ref: mealCategory,
      d: dateIso
    };
    state.comidas.push(entry);
    this.saveState(state);
    return entry;
  }

  addWorkout(activityName, type, minutes, kcalBurned, icon = 'dumb', dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    const entry = {
      id: FormatUtils.generateUid(),
      nome: String(activityName).trim(),
      tipo: type,
      min: Math.round(Number(minutes) || 0),
      kcal: Math.round(Number(kcalBurned) || 0),
      ic: icon,
      d: dateIso
    };
    state.treinos.push(entry);
    this.saveState(state);
    return entry;
  }

  addWeight(weightKg, dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    const entry = {
      id: FormatUtils.generateUid(),
      kg: Number(weightKg),
      d: dateIso
    };
    state.pesos.push(entry);
    this.saveState(state);
    return entry;
  }

  setHydrationGlasses(glassesCount, dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    state.agua = state.agua || {};
    state.agua[dateIso] = Math.max(0, Number(glassesCount) || 0);
    this.saveState(state);
    return state.agua[dateIso];
  }

  getHydrationGlasses(dateIso = FormatUtils.getTodayIso()) {
    const state = this.getState();
    return (state.agua && state.agua[dateIso]) || 0;
  }
}
