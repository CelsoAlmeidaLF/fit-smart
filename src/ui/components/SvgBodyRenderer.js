import { HevyMuscleRenderer } from './HevyMuscleRenderer.js';

/**
 * Componente Visual de Renderização Anatômica SVG (Corpo Humano Anterior e Posterior)
 * Redireciona para o motor de alta precisão 2D HevyMuscleRenderer.
 */
export class SvgBodyRenderer {
  static WIDTH = HevyMuscleRenderer.WIDTH;
  static HEIGHT = HevyMuscleRenderer.HEIGHT;

  /**
   * Renderiza a silhueta corporal vetorial 2D de fundo
   */
  static renderBackgroundImages(bodyViewData, viewKey = 'front') {
    return '';
  }

  /**
   * Renderiza o minimapa anatômico destacando as regiões selecionadas (Estilo Hevy / MuscleWiki 2D)
   */
  static renderMiniBody(regionIds = []) {
    return HevyMuscleRenderer.renderMiniCard(regionIds, 'ok');
  }

  /**
   * Renderiza a visão anatômica completa interativa por estado
   */
  static renderFullInteractiveView(viewKey = 'front', muscleStatusMap = {}) {
    return HevyMuscleRenderer.renderInteractiveBody(viewKey, '', muscleStatusMap);
  }
}
