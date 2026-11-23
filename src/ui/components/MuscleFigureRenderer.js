import { MuscleRecoveryModel } from '../../domain/models/MuscleRecoveryModel.js';
import { FormatUtils } from '../../domain/utils/FormatUtils.js';

/**
 * MuscleFigureRenderer - figuras musculares a partir das imagens oficiais do data.zip.
 * Não desenha nada por código: o estado de recuperação aparece como borda/selo/legenda,
 * nunca pintado sobre a imagem. Estilos em styles.css (.mfig, .bfig, .mleg).
 */
export class MuscleFigureRenderer {
  /** Imagem do músculo (foto própria ou ícone regional) para cards e detalhe */
  static renderMuscleImage(muscle, { size = 'card' } = {}) {
    const src = MuscleRecoveryModel.getMuscleImage(muscle);
    if (!src) return '';
    const own = !!MuscleRecoveryModel.getMuscleIconPath(muscle.id);
    const alt = own ? muscle.n : `${muscle.n} (ícone da região: ${muscle.r})`;
    return `<img class="mfig mfig-${size}" src="${src}" alt="${FormatUtils.escapeHtml(alt)}" width="1024" height="1024" loading="lazy" decoding="async">`;
  }

  /** Corpo inteiro: vista anterior ou posterior do data.zip (sem sobreposição de formas) */
  static renderBodyView(viewKey = 'front') {
    const key = MuscleRecoveryModel.BODY_VIEW_IMAGES[viewKey] ? viewKey : 'front';
    const label = MuscleRecoveryModel.BODY_VIEW_LABELS[key];
    return `<figure class="bfig"><img src="${MuscleRecoveryModel.BODY_VIEW_IMAGES[key]}" alt="Sistema muscular humano, vista ${label}" width="896" height="1200" loading="lazy" decoding="async"></figure>`;
  }

  /**
   * Legenda por músculo da vista atual, agrupada por região, com selo de status.
   * @param {object[]} catalog MUSCLE_CATALOG
   * @param {object} statusMap id -> { key, label }
   * @param {object} opts { viewKey, selectedId, markedIds, attr, showStatus } (showStatus:false esconde o selo e mostra a região)
   */
  static renderLegend(catalog, statusMap = {}, opts = {}) {
    const { viewKey = 'front', selectedId = '', markedIds = [], attr = 'data-mus', showStatus = true } = opts;
    const side = viewKey === 'back' ? 'posterior' : 'anterior';
    const groups = new Map();
    catalog.filter(m => m.v === side).forEach(m => {
      if (!groups.has(m.c)) groups.set(m.c, []);
      groups.get(m.c).push(m);
    });

    return [...groups.entries()].map(([cat, list]) => `
      <section class="mleg-grp" aria-label="${FormatUtils.escapeHtml(cat)}">
        <h4>${FormatUtils.escapeHtml(cat)}</h4>
        <div class="mleg">
          ${list.map(m => {
            const st = statusMap[m.id] || { key: 'new', label: 'Sem registro' };
            const marked = markedIds.includes(m.id);
            return `
            <button type="button" class="mleg-it${m.id === selectedId ? ' on' : ''}${marked ? ' mk' : ''}" ${attr}="${m.id}" aria-pressed="${m.id === selectedId}">
              ${showStatus ? `<span class="sti k-${st.key}" aria-hidden="true">${MuscleRecoveryModel.getStatusIconSvg(st.key)}</span>` : ''}
              <span class="mleg-t"><b>${FormatUtils.escapeHtml(m.n)}</b><small>${FormatUtils.escapeHtml(showStatus ? st.label : m.r)}</small></span>
            </button>`;
          }).join('')}
        </div>
      </section>`).join('');
  }
}
