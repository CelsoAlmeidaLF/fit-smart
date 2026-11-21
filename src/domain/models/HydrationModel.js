/**
 * Modelo de Controle de Hidratação Diária
 */
export class HydrationModel {
  static GLASS_VOLUME_ML = 250;
  static DEFAULT_GLASSES_TARGET = 8; // 2000 ml

  static calculateVolumeMl(glassesCount) {
    return Math.max(0, Number(glassesCount) || 0) * this.GLASS_VOLUME_ML;
  }

  static calculateProgressPercent(glassesCount, targetGlasses = 8) {
    const target = Math.max(1, Number(targetGlasses) || this.DEFAULT_GLASSES_TARGET);
    return Math.min(100, Math.round(((Number(glassesCount) || 0) / target) * 100));
  }
}
