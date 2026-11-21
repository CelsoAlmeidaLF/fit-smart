import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BmrTdeeCalculatorModel } from '../src/domain/models/BmrTdeeCalculatorModel.js';
import { HydrationModel } from '../src/domain/models/HydrationModel.js';
import { FormatUtils } from '../src/domain/utils/FormatUtils.js';
import { LocalStorageFitSmartAdapter } from '../src/infrastructure/storage/LocalStorageFitSmartAdapter.js';
import { HealthProfileService } from '../src/application/services/HealthProfileService.js';
import { WorkoutDietService } from '../src/application/services/WorkoutDietService.js';

test('BmrTdeeCalculatorModel - Cálculo de TMB (Mifflin-St Jeor)', () => {
  // Homem: 80 kg, 175 cm, 30 anos -> 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 -> 1749
  const bmrMale = BmrTdeeCalculatorModel.calculateBMR(80, 175, 30, true);
  assert.equal(bmrMale, 1749);

  // Mulher: 60 kg, 165 cm, 25 anos -> 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
  const bmrFemale = BmrTdeeCalculatorModel.calculateBMR(60, 165, 25, false);
  assert.equal(bmrFemale, 1345);
});

test('BmrTdeeCalculatorModel - Cálculo de TDEE e Metas Calóricas com Piso de Segurança', () => {
  const bmr = 1750;
  const tdee = BmrTdeeCalculatorModel.calculateTDEE(bmr, 1.55); // 1750 * 1.55 = 2712.5 -> 2713
  assert.equal(tdee, 2713);

  // Déficit de 0.5 kg/semana = 500 kcal -> 2713 - 500 = 2213 -> round 10 = 2210
  const target = BmrTdeeCalculatorModel.calculateTargetCalories(tdee, 0.5, true);
  assert.equal(target, 2210);

  // Proteção do piso calórico: homem nunca fica abaixo de 1500 kcal
  const lowTdee = 1600;
  const floorProtected = BmrTdeeCalculatorModel.calculateTargetCalories(lowTdee, 1.0, true); // deficit 1000 -> 600 < 1500
  assert.equal(floorProtected, 1500);

  // Proteção do piso calórico: mulher nunca fica abaixo de 1200 kcal
  const floorFemale = BmrTdeeCalculatorModel.calculateTargetCalories(1300, 0.75, false); // deficit 750 -> 550 < 1200
  assert.equal(floorFemale, 1200);
});

test('BmrTdeeCalculatorModel - Cálculo e Classificação de IMC segundo OMS', () => {
  // 80 kg, 175 cm -> 80 / (1.75^2) = 26.12 -> 26.1
  const bmi = BmrTdeeCalculatorModel.calculateBMI(80, 175);
  assert.equal(bmi, 26.1);
  assert.equal(BmrTdeeCalculatorModel.classifyBMI(bmi), 'sobrepeso');

  assert.equal(BmrTdeeCalculatorModel.classifyBMI(17.9), 'abaixo do peso');
  assert.equal(BmrTdeeCalculatorModel.classifyBMI(22.5), 'normal');
  assert.equal(BmrTdeeCalculatorModel.classifyBMI(32.0), 'obesidade grau I');
  assert.equal(BmrTdeeCalculatorModel.classifyBMI(37.0), 'obesidade grau II');
  assert.equal(BmrTdeeCalculatorModel.classifyBMI(42.0), 'obesidade grau III');
});

test('HydrationModel - Volume em ml e Percentual de Progresso', () => {
  assert.equal(HydrationModel.calculateVolumeMl(0), 0);
  assert.equal(HydrationModel.calculateVolumeMl(4), 1000);
  assert.equal(HydrationModel.calculateVolumeMl(8), 2000);

  assert.equal(HydrationModel.calculateProgressPercent(4, 8), 50);
  assert.equal(HydrationModel.calculateProgressPercent(8, 8), 100);
  assert.equal(HydrationModel.calculateProgressPercent(12, 8), 100); // capped at 100%
});

test('FormatUtils - Sanitização e Formatação Canônica', () => {
  assert.equal(FormatUtils.escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(FormatUtils.formatDateBr('2026-11-21'), '21/11/2026');
  assert.match(FormatUtils.getTodayIso(), /^\d{4}-\d{2}-\d{2}$/);
});

test('LocalStorageFitSmartAdapter e HealthProfileService - Carga e Cálculos de Perfil', () => {
  class MockStorageAdapter extends LocalStorageFitSmartAdapter {
    constructor() {
      super('mock-fit');
      this.memoryState = null;
    }
    loadState() {
      if (!this.memoryState) {
        this.memoryState = this._createDefaultState();
        this._applyMigrations(this.memoryState, false);
      }
      return this.memoryState;
    }
    saveState(state) {
      this.memoryState = state;
      return true;
    }
  }

  const adapter = new MockStorageAdapter();
  const healthService = new HealthProfileService(adapter);

  healthService.addWeightEntry(82.5, '2026-11-20');
  healthService.addWeightEntry(81.8, '2026-11-21');

  assert.equal(healthService.getCurrentWeight(), 81.8);

  const summary = healthService.getHealthSummary();
  assert.equal(summary.currentWeight, 81.8);
  assert.ok(summary.bmr > 0);
  assert.ok(summary.tdee > summary.bmr);
  assert.ok(summary.targetKcal >= 1500);
});

test('WorkoutDietService - Balanço Energético Diário e Transações', () => {
  class MockStorageAdapter extends LocalStorageFitSmartAdapter {
    constructor() {
      super('mock-fit-2');
      this.memoryState = this._createDefaultState();
      this._applyMigrations(this.memoryState, false);
    }
    loadState() {
      return this.memoryState;
    }
    saveState(state) {
      this.memoryState = state;
      return true;
    }
  }

  const adapter = new MockStorageAdapter();
  const service = new WorkoutDietService(adapter);
  const today = FormatUtils.getTodayIso();

  service.addMeal('Almoço Saudável', 650, 'Almoço', today);
  service.addMeal('Lanche da Tarde', 250, 'Lanche', today);
  assert.equal(service.getDailyCaloriesConsumed(today), 900);

  service.addWorkout('Corrida no Parque', 'Aeróbico', 30, 300, 'run', today);
  assert.equal(service.getDailyCaloriesBurned(today), 300);

  const balance = service.getDailyEnergyBalance(today);
  assert.equal(balance.consumedKcal, 900);
  assert.equal(balance.burnedKcal, 300);
  assert.equal(balance.remainingKcal, balance.targetKcal + 300 - 900);
});
