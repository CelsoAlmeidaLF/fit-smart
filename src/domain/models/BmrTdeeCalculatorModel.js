/**
 * Modelo de Cálculo Metabólico (Mifflin-St Jeor), TDEE, IMC e Metas Calóricas
 */
export class BmrTdeeCalculatorModel {
  /**
   * Calcula a Taxa Metabólica Basal (BMR / TMB):
   * TMB = 10 * peso (kg) + 6.25 * altura (cm) - 5 * idade (anos) + (sexo === 'm' ? 5 : -161)
   */
  static calculateBMR(weightKg, heightCm, ageYears, isMale = true) {
    const w = Number(weightKg) || 0;
    const h = Number(heightCm) || 0;
    const a = Number(ageYears) || 0;
    if (w <= 0 || h <= 0 || a <= 0) return 0;

    const base = 10 * w + 6.25 * h - 5 * a;
    return Math.round(base + (isMale ? 5 : -161));
  }

  /**
   * Calcula o Gasto Energético Total Diário (TDEE):
   * TDEE = TMB * Fator de Atividade
   */
  static calculateTDEE(bmr, activityFactor = 1.2) {
    return Math.round((Number(bmr) || 0) * (Number(activityFactor) || 1.2));
  }

  /**
   * Piso calórico seguro para saúde metabólica
   */
  static getCaloricFloor(isMale = true) {
    return isMale ? 1500 : 1200;
  }

  /**
   * Calcula a meta diária de calorias para perda/ganho de peso seguro:
   * Déficit de ~500 kcal/dia para ~0.5 kg/semana
   */
  static calculateTargetCalories(tdee, paceKgPerWeek = 0.5, isMale = true) {
    const floor = this.getCaloricFloor(isMale);
    const deficit = (Number(paceKgPerWeek) || 0) * 1000;
    const target = (Number(tdee) || 0) - deficit;
    return Math.round(Math.max(floor, target) / 10) * 10;
  }

  /**
   * Calcula o Índice de Massa Corporal (IMC)
   */
  static calculateBMI(weightKg, heightCm) {
    const w = Number(weightKg) || 0;
    const h = Number(heightCm) / 100 || 0;
    if (w <= 0 || h <= 0) return 0;
    return Math.round((w / (h * h)) * 10) / 10;
  }

  /**
   * Classificação do IMC segundo a OMS
   */
  static classifyBMI(bmi) {
    const v = Number(bmi) || 0;
    if (v <= 0) return 'indeterminado';
    if (v < 18.5) return 'abaixo do peso';
    if (v < 25.0) return 'normal';
    if (v < 30.0) return 'sobrepeso';
    if (v < 35.0) return 'obesidade grau I';
    if (v < 40.0) return 'obesidade grau II';
    return 'obesidade grau III';
  }

  static calculateAge(birthDateString, now = new Date()) {
    if (!birthDateString) return 30; // fallback padrão
    const b = new Date(birthDateString);
    if (isNaN(b.getTime())) return 30;
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return Math.max(1, age);
  }
}
