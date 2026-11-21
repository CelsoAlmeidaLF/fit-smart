import { BmrTdeeCalculatorModel } from '../../domain/models/BmrTdeeCalculatorModel.js';

/**
 * Serviço de Aplicação: Perfil de Saúde, Metas e Balanço Calórico
 */
export class HealthProfileService {
  constructor(storageAdapter) {
    this._storage = storageAdapter;
  }

  getCurrentWeight() {
    const state = this._storage.loadState();
    const sorted = (state.pesos || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
    if (sorted.length) {
      return Number(sorted[sorted.length - 1].kg);
    }
    return Number(state.perfil && state.perfil.ini) || 80;
  }

  getHealthSummary() {
    const state = this._storage.loadState();
    const weight = this.getCurrentWeight();
    const height = state.perfil.alt || 170;
    const isMale = state.perfil.sexo === 'm';
    const age = BmrTdeeCalculatorModel.calculateAge(state.perfil.nasc);
    const activityFactor = state.perfil.ativ || 1.2;
    const pace = state.perfil.ritmo || 0.5;

    const bmr = BmrTdeeCalculatorModel.calculateBMR(weight, height, age, isMale);
    const tdee = BmrTdeeCalculatorModel.calculateTDEE(bmr, activityFactor);
    const targetKcal = BmrTdeeCalculatorModel.calculateTargetCalories(tdee, pace, isMale);
    const bmi = BmrTdeeCalculatorModel.calculateBMI(weight, height);
    const bmiCategory = BmrTdeeCalculatorModel.classifyBMI(bmi);

    return {
      currentWeight: weight,
      height,
      age,
      bmr,
      tdee,
      targetKcal,
      bmi,
      bmiCategory
    };
  }

  addWeightEntry(weightKg, dateIso) {
    const state = this._storage.loadState();
    const entry = {
      id: Date.now().toString(36),
      kg: Number(weightKg),
      d: dateIso
    };
    state.pesos.push(entry);
    this._storage.saveState(state);
    return entry;
  }
}
