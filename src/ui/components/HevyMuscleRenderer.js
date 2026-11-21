import { BODY_DIAGRAM, BODY_VIEW_MAP } from '../../domain/catalogs/BodyDiagramCatalog.js';

/**
 * HevyMuscleRenderer — Renderizador Anatômico Vetorial 2D no Padrão Hevy / Strong / MuscleWiki
 * Renderiza silhuetas anatômicas humanas em 2D puro (SVG), sem imagens rasterizadas e sem molduras de app.
 */
export const BODY_SILHOUETTES = {
  front: "M 176 15 L 177 16 L 184 16 L 185 15 L 194 19 L 199 24 L 203 31 L 204 34 L 204 45 L 207 48 L 207 52 L 204 62 L 200 65 L 200 82 L 208 89 L 229 101 L 237 101 L 246 104 L 258 116 L 263 129 L 263 143 L 262 147 L 265 151 L 270 163 L 271 185 L 280 201 L 283 210 L 284 227 L 285 228 L 284 229 L 285 230 L 285 239 L 286 240 L 288 254 L 290 260 L 302 270 L 302 272 L 306 276 L 307 279 L 311 282 L 311 284 L 309 286 L 304 286 L 301 283 L 300 284 L 301 296 L 302 297 L 302 310 L 300 312 L 298 311 L 295 316 L 292 316 L 289 313 L 287 314 L 282 308 L 281 309 L 278 307 L 271 285 L 271 281 L 270 280 L 270 264 L 267 257 L 267 254 L 251 226 L 248 217 L 246 201 L 244 197 L 245 194 L 238 181 L 235 171 L 234 170 L 233 171 L 224 188 L 224 192 L 223 193 L 223 205 L 225 212 L 224 225 L 229 239 L 229 243 L 231 249 L 231 259 L 236 275 L 239 295 L 240 296 L 240 305 L 241 306 L 240 327 L 234 350 L 234 367 L 235 368 L 234 378 L 242 406 L 242 424 L 241 425 L 240 435 L 234 461 L 233 473 L 232 474 L 232 484 L 233 485 L 233 495 L 236 500 L 237 505 L 247 518 L 247 522 L 245 524 L 241 526 L 240 525 L 238 527 L 233 527 L 232 528 L 227 526 L 224 528 L 218 528 L 214 524 L 213 515 L 209 510 L 209 504 L 211 498 L 210 494 L 211 464 L 210 463 L 210 456 L 209 455 L 207 441 L 204 436 L 201 425 L 201 406 L 202 405 L 202 397 L 203 396 L 203 383 L 198 370 L 196 353 L 195 352 L 192 335 L 189 329 L 184 311 L 183 301 L 182 300 L 182 289 L 181 288 L 181 284 L 182 283 L 181 282 L 178 283 L 176 307 L 172 319 L 172 322 L 166 337 L 164 349 L 162 354 L 159 374 L 154 385 L 156 405 L 157 406 L 157 424 L 156 425 L 155 433 L 150 442 L 150 447 L 148 452 L 147 464 L 146 465 L 146 486 L 147 487 L 146 502 L 147 503 L 147 511 L 142 515 L 143 519 L 141 525 L 137 528 L 131 528 L 128 526 L 124 528 L 118 527 L 115 525 L 114 526 L 110 524 L 108 521 L 108 519 L 111 514 L 119 505 L 123 495 L 123 487 L 124 486 L 124 468 L 123 467 L 123 461 L 122 460 L 121 449 L 119 443 L 119 437 L 116 425 L 116 417 L 115 416 L 116 415 L 117 400 L 123 382 L 123 366 L 124 365 L 124 351 L 121 341 L 121 337 L 119 331 L 119 323 L 118 322 L 118 303 L 119 302 L 119 295 L 120 294 L 123 274 L 128 258 L 128 251 L 129 250 L 130 240 L 135 226 L 135 220 L 134 219 L 135 215 L 134 214 L 137 201 L 135 186 L 131 180 L 127 170 L 126 169 L 125 170 L 123 178 L 116 190 L 113 214 L 109 225 L 98 243 L 90 262 L 89 266 L 90 270 L 89 283 L 82 306 L 79 309 L 77 308 L 73 314 L 70 314 L 68 316 L 63 315 L 63 312 L 62 311 L 60 312 L 57 309 L 60 283 L 59 282 L 58 284 L 54 286 L 49 285 L 49 281 L 57 273 L 59 268 L 70 260 L 74 244 L 74 239 L 75 238 L 75 225 L 76 224 L 77 210 L 81 198 L 88 187 L 89 178 L 90 177 L 90 163 L 92 157 L 98 147 L 97 143 L 97 130 L 100 120 L 105 112 L 111 106 L 119 102 L 131 101 L 149 90 L 156 87 L 160 83 L 160 65 L 157 63 L 154 54 L 154 48 L 157 45 L 157 35 L 162 24 L 169 18 L 176 15 Z",
  back: "M 177 15 L 178 16 L 183 16 L 184 15 L 194 19 L 199 24 L 204 34 L 204 45 L 207 50 L 206 51 L 206 57 L 203 63 L 200 65 L 201 66 L 200 69 L 200 81 L 207 86 L 228 97 L 233 101 L 242 101 L 250 104 L 258 111 L 264 121 L 266 128 L 265 147 L 267 149 L 272 160 L 274 185 L 282 198 L 285 209 L 286 239 L 287 240 L 287 246 L 290 259 L 301 269 L 301 271 L 310 282 L 310 284 L 308 286 L 304 286 L 300 282 L 299 283 L 300 298 L 301 299 L 301 309 L 299 311 L 297 311 L 293 316 L 291 316 L 288 313 L 286 314 L 282 308 L 278 307 L 276 303 L 275 294 L 271 281 L 271 265 L 270 264 L 270 260 L 265 246 L 251 219 L 250 211 L 249 210 L 249 204 L 248 203 L 248 197 L 247 196 L 247 190 L 242 184 L 236 171 L 236 167 L 235 166 L 224 191 L 224 199 L 223 201 L 226 212 L 226 226 L 231 240 L 232 255 L 238 276 L 238 281 L 240 286 L 241 298 L 242 299 L 242 323 L 241 324 L 241 331 L 236 351 L 236 366 L 237 367 L 237 381 L 245 405 L 246 422 L 245 423 L 245 428 L 243 433 L 241 448 L 240 449 L 237 469 L 236 470 L 235 495 L 236 496 L 236 505 L 242 512 L 246 513 L 250 518 L 246 523 L 235 525 L 228 529 L 217 528 L 214 524 L 215 505 L 213 501 L 213 497 L 215 493 L 215 475 L 214 474 L 214 467 L 213 466 L 209 445 L 206 439 L 202 425 L 202 413 L 203 412 L 203 406 L 205 399 L 205 386 L 203 383 L 199 370 L 196 348 L 193 335 L 186 316 L 184 299 L 183 298 L 183 286 L 181 280 L 178 281 L 177 298 L 176 299 L 174 315 L 171 322 L 170 328 L 167 333 L 164 350 L 163 351 L 162 361 L 161 362 L 160 372 L 154 388 L 154 397 L 157 410 L 157 427 L 154 437 L 150 445 L 146 466 L 145 467 L 145 472 L 144 473 L 144 494 L 145 495 L 144 516 L 145 517 L 145 523 L 141 528 L 130 529 L 123 525 L 115 524 L 110 521 L 111 515 L 113 513 L 116 513 L 123 505 L 123 496 L 124 495 L 124 476 L 123 475 L 123 469 L 122 468 L 118 439 L 114 424 L 114 411 L 117 398 L 119 395 L 123 381 L 123 365 L 124 364 L 124 352 L 123 351 L 120 331 L 119 330 L 119 323 L 118 322 L 119 293 L 120 292 L 123 272 L 128 256 L 129 242 L 133 228 L 135 225 L 134 224 L 134 217 L 137 205 L 136 189 L 130 178 L 127 169 L 126 168 L 124 170 L 124 172 L 114 190 L 114 195 L 112 202 L 112 210 L 110 213 L 110 217 L 108 223 L 96 245 L 91 258 L 89 266 L 89 281 L 82 307 L 79 309 L 78 308 L 73 314 L 72 313 L 67 316 L 63 311 L 61 311 L 59 309 L 59 297 L 60 296 L 61 283 L 60 282 L 56 285 L 52 285 L 50 283 L 50 281 L 54 278 L 55 275 L 59 271 L 59 269 L 65 263 L 70 260 L 72 254 L 73 246 L 74 245 L 74 239 L 75 238 L 75 215 L 76 214 L 76 208 L 79 198 L 83 190 L 87 185 L 89 160 L 91 154 L 96 146 L 95 142 L 95 129 L 97 121 L 103 111 L 111 104 L 119 101 L 127 101 L 136 95 L 151 88 L 161 81 L 161 65 L 157 60 L 156 51 L 155 50 L 158 45 L 159 32 L 163 24 L 168 19 L 177 15 Z"
};

export class HevyMuscleRenderer {
  static WIDTH = 361.156;
  static HEIGHT = 541.867;

  static STATUS_COLORS = {
    ok: '#6FCF97',      // Verde neon Hevy (recuperado / pronto)
    warn: '#E0C185',    // Âmbar / Amarelo (quase pronto)
    bad: '#E08585',     // Vermelho anabólico (fadigado / recuperando)
    new: '#6FCF97'      // Padrão neon
  };

  /**
   * Renderiza a silhueta anatômica 2D para mini-cards de músculos (estilo Hevy / Strong)
   * @param {string[]} regionIds Lista de IDs de regiões (ex: ['pectoralis'])
   * @param {string} statusKey Estado do músculo ('ok', 'warn', 'bad', 'new')
   * @param {object} options Configurações adicionais (activeColor, baseColor, strokeColor)
   * @returns {string} Código SVG puro 2D
   */
  static renderMiniCard(regionIds = [], statusKey = 'ok', options = {}) {
    const primaryId = regionIds[0] || 'pectoralis';
    const viewKey = BODY_VIEW_MAP[primaryId] || 'front';
    const bodyView = BODY_DIAGRAM[viewKey];
    if (!bodyView) return '';

    const bodySilhouette = BODY_SILHOUETTES[viewKey] || '';
    const activeColor = options.activeColor || this.STATUS_COLORS[statusKey] || '#6FCF97';
    const baseMuscleColor = options.baseColor || '#222C27';
    const baseMuscleStroke = options.strokeColor || '#161D19';
    const bodyBaseColor = options.bodyColor || '#1A221E';
    const bodyBaseStroke = options.bodyStroke || '#26352F';

    // Todos os músculos inativos
    const inactivePaths = bodyView.m
      .filter(m => !regionIds.includes(m.id))
      .map(m => `<path d="${m.d}" fill="${baseMuscleColor}" stroke="${baseMuscleStroke}" stroke-width="0.8" opacity="0.9"/>`)
      .join('');

    // Músculos ativos em destaque vivo Hevy
    const activePaths = bodyView.m
      .filter(m => regionIds.includes(m.id))
      .map(m => `<path d="${m.d}" fill="${activeColor}" stroke="${activeColor}" stroke-width="1.4" style="filter:drop-shadow(0 0 6px ${activeColor}99)"/>`)
      .join('');

    return `
      <svg viewBox="0 0 ${this.WIDTH} ${this.HEIGHT}" class="hevy-muscle-svg" style="width:100%;height:100%;display:block;overflow:visible;pointer-events:none" aria-hidden="true">
        <!-- Silhueta Base do Corpo Humano 2D (Hevy / Strong) -->
        <path d="${bodySilhouette}" fill="${bodyBaseColor}" stroke="${bodyBaseStroke}" stroke-width="1.2" class="hevy-silhouette"/>
        <!-- Músculos Neutros de Fundo -->
        <g class="hevy-inactive-muscles">${inactivePaths}</g>
        <!-- Músculo Ativo Destacado -->
        <g class="hevy-active-muscles">${activePaths}</g>
      </svg>
    `;
  }

  /**
   * Renderiza a visão anatômica completa interativa (Frente ou Costas)
   * @param {string} viewKey 'front' ou 'back'
   * @param {string} selectedId ID do músculo selecionado
   * @param {object} statusMap Mapa de status por músculo
   * @param {object} options Configurações de destaque
   * @returns {string} Código SVG interativo
   */
  static renderInteractiveBody(viewKey = 'front', selectedId = '', statusMap = {}, options = {}) {
    const bodyView = BODY_DIAGRAM[viewKey] || BODY_DIAGRAM.front;
    if (!bodyView) return '';

    const bodySilhouette = BODY_SILHOUETTES[viewKey] || '';
    const bodyBaseColor = options.bodyColor || '#1A221E';
    const bodyBaseStroke = options.bodyStroke || '#26352F';

    const musclesHtml = bodyView.m.map(m => {
      const isSelected = m.id === selectedId;
      const statusInfo = statusMap[m.id] || { key: 'ok' };
      const statusColor = this.STATUS_COLORS[statusInfo.key] || '#6FCF97';
      const fill = isSelected ? statusColor : (options.highlightIds && options.highlightIds.includes(m.id)) ? 'rgba(230,126,34,0.5)' : '#222C27';
      const stroke = isSelected ? '#FFFFFF' : '#161D19';
      const strokeWidth = isSelected ? '1.8' : '0.8';
      const filter = isSelected ? `style="filter:drop-shadow(0 0 8px ${statusColor})"` : '';

      return `
        <path data-m="${m.id}" d="${m.d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${filter} style="cursor:pointer;transition:all 0.2s ease" class="hevy-muscle-path${isSelected ? ' on' : ''}">
          <title>${m.pt}</title>
        </path>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${this.WIDTH} ${this.HEIGHT}" class="hevy-body-interactive" role="img" aria-label="Mapa Muscular Anatômico 2D" style="width:100%;height:auto;cursor:pointer;display:block">
        <!-- Silhueta Base do Corpo 2D -->
        <path d="${bodySilhouette}" fill="${bodyBaseColor}" stroke="${bodyBaseStroke}" stroke-width="1.4"/>
        <!-- Músculos Anatômicos Vetoriais -->
        <g class="hevy-muscles-layer">
          ${musclesHtml}
        </g>
      </svg>
    `;
  }
}
