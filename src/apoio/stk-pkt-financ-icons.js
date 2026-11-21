/* FINANC icons v2.0 — Suíte Profissional de Ícones Vetoriais SVG (Systekna / Lucide / Fitness Pro).
   Suporta 3 suítes visuais comutáveis:
   1. 'duotone' (Pro Athletic Duotone — preenchimento translúcido 18%)
   2. 'solid'   (High-Impact Solid — preenchimento sólido 95%)
   3. 'line'    (Precision Line — traço puro 2.0px sem fill)
   Uso: FinancIcons.svg('dumbbell', { size: 24, suite: 'duotone' })
*/
(function (root) {
  'use strict';

  const PATHS = {
    // 1. Navegação e Sistema Canônico
    'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" class="fi-fill"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3" class="fi-fill"/>',
    'search': '<circle cx="11" cy="11" r="8" class="fi-fill"/><path d="m21 21-4.3-4.3"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    'arrow-up': '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    'more-horizontal': '<circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/>',
    'more-vertical': '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'minus': '<path d="M5 12h14"/>',
    'check': '<polyline points="20 6 9 17 4 12"/>',

    // 2. Musculação, Treino & Fitness Profissional (Padrão Hevy / Strong)
    // Haltere Horizontal Simétrico Pro (Hex Dumbbell Eleiko/Hevy)
    'dumbbell': '<path d="M7 12h10"/><rect x="2" y="6" width="3" height="12" rx="1" class="fi-fill"/><rect x="5" y="8" width="2" height="8" rx="0.5" class="fi-fill"/><rect x="17" y="8" width="2" height="8" rx="0.5" class="fi-fill"/><rect x="19" y="6" width="3" height="12" rx="1" class="fi-fill"/><line x1="10" y1="11" x2="10" y2="13"/><line x1="14" y1="11" x2="14" y2="13"/>',
    
    // Balança Digital de Bioimpedância (Smart Scale com eletrodos corporais ITO)
    'scale': '<rect x="3" y="3" width="18" height="18" rx="4" class="fi-fill"/><rect x="8.5" y="5.5" width="7" height="3" rx="1"/><circle cx="7" cy="13" r="1.8"/><circle cx="17" cy="13" r="1.8"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/><line x1="12" y1="10" x2="12" y2="19" stroke-dasharray="2 2"/>',

    // Barra Olímpica Carregada (Olympic Barbell com bumper plates e presilhas Lock-Jaw)
    'barbell': '<line x1="1" y1="12" x2="23" y2="12"/><rect x="3" y="6.5" width="2" height="11" rx="0.5" class="fi-fill"/><rect x="5" y="4" width="2.5" height="16" rx="0.8" class="fi-fill"/><rect x="7.5" y="9" width="1.5" height="6" rx="0.5"/><rect x="15" y="9" width="1.5" height="6" rx="0.5"/><rect x="16.5" y="4" width="2.5" height="16" rx="0.8" class="fi-fill"/><rect x="19" y="6.5" width="2" height="11" rx="0.5" class="fi-fill"/>',

    // Anilha Olímpica 20kg Three-Grip de Competição (Olympic Plate Eleiko/Rogue)
    'plate': '<circle cx="12" cy="12" r="9.5" class="fi-fill"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" class="fi-fill"/><path d="M10 5.2h4"/><path d="M6 14.5l2-3.5"/><path d="M18 14.5l-2-3.5"/>',

    // Kettlebell Oficial de Competição
    'kettlebell': '<path d="M8 8a4 4 0 0 1 8 0v2H8V8Z"/><path d="M7 10h10a5 5 0 0 1 4 4.8c0 3.8-3 6.2-7 6.2s-7-2.4-7-6.2A5 5 0 0 1 7 10Z" class="fi-fill"/><rect x="9.5" y="6.5" width="5" height="3" rx="1.5"/>',

    // Cardio & Eletrocardiograma (ECG Pulse)
    'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'heart-pulse': '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" class="fi-fill"/><path d="M3 12h3.5l1.5 -3.5l3 7l2 -5l1.5 1.5h6"/>',

    // Chama Metabólica / Queima Calórica
    'flame': '<path d="M12 2c.5 2.5 2 4.5 4 6.5 2 2 3 4.5 3 7.5a7 7 0 1 1-14 0c0-3 1.5-5 3-7 1-1.3 2-3 2-5 0 1 .5 2 2-2Z" class="fi-fill"/><path d="M12 14a2.5 2.5 0 0 0 2.5-2.5c0-.8-.4-1.5-1-2-.5 1-1.5 1-1.5 2a.5.5 0 0 1-1 0c0-.8.5-1.5 1-2.5-1.5 1-2 2-2 3.5a2.5 2.5 0 0 0 2.5 2.5Z"/>',

    // Coqueteleira / Shaker Bottle de Suplementação & Hidratação
    'water-shaker': '<path d="M6 8h12l-1.5 12a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2L6 8Z" class="fi-fill"/><path d="M5 5h14v3H5z"/><path d="M14 2h3v3h-3z"/><path d="M10 12h4M10 15h3M10 18h2"/>',
    'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" class="fi-fill"/>',

    // Cronômetro Esportivo com Lap/Split (Séries e Descanso)
    'timer': '<circle cx="12" cy="13.5" r="8" class="fi-fill"/><path d="M10 2h4M12 2v3.5M18 6.5l1.5-1.5M12 13.5V9M12 13.5l3 2"/>',

    // Ficha de Treino / Prancheta do Personal (Workout Log com Checklist)
    'clipboard-list': '<rect width="16" height="18" x="4" y="4" rx="2.5" class="fi-fill"/><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z"/><path d="m8 10 1.5 1.5 3-3M14 10h3"/><path d="m8 14.5 1.5 1.5 3-3M14 15h3"/><path d="M8 18.5h9"/>',

    // Silhueta Muscular V-Taper / Corpo Atlético 2D
    'body': '<circle cx="12" cy="4" r="2" class="fi-fill"/><path d="M7 8.5c1.5-1 3.2-1.5 5-1.5s3.5.5 5 1.5l1.5 4.5-2 .8-1-3.3h-2l-.5 4h-2l-.5-4h-2l-1 3.3-2-.8z" class="fi-fill"/><path d="M9.5 14.5l-.5 7.5h2l.5-5h1l.5 5h2l-.5-7.5z" class="fi-fill"/>',

    // Fita Métrica Antropométrica (Medidas Corporais)
    'tape-measure': '<circle cx="10" cy="14" r="7" class="fi-fill"/><path d="M10 7h11a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4"/><path d="M14 7v2M17 7v3M20 7v2"/><circle cx="10" cy="14" r="2.5"/>',

    // Braço Musculoso Flexionado (Bíceps)
    'biceps': '<path d="M18 10a4 4 0 0 0-4-4c-1.5 0-3 1-4 2.5L8.5 7A3.5 3.5 0 0 0 5 12v3a5 5 0 0 0 5 5h3a6 6 0 0 0 6-6v-4Z" class="fi-fill"/><path d="M10 13c1 1.5 2.5 2 4.5 1.5"/>',

    // Anéis de Atividade Esportiva (Três Anéis Concêntricos)
    'activity-rings': '<path d="M12 3a9 9 0 1 1-6.36 2.64"/><path d="M12 6a6 6 0 1 1-4.24 1.76"/><path d="M12 9a3 3 0 1 1-2.12.88"/>',

    // Nutrição Esportiva & Dieta Limpa (Tigela com Vegetais)
    'utensils': '<path d="M3 11c0 5 4 8 9 8s9-3 9-8H3Z" class="fi-fill"/><path d="M8 19v2h8v-2M12 11V6a4 4 0 0 1 4-4c0 3-1.5 5-4 5Z"/>',

    // Calculadora de Macros & 1RM
    'calculator': '<rect width="16" height="20" x="4" y="2" rx="3" class="fi-fill"/><rect width="10" height="4" x="7" y="5" rx="1"/><path d="M7 12h2M11 12h2M15 12h2M7 15h2M11 15h2M15 15h2M7 18h2M11 18h6"/>',

    // Prontidão & Energia SNC
    'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" class="fi-fill"/>',

    // Conquista & Recorde Pessoal (PR)
    'trophy': '<path d="M6 4h12v6a6 6 0 0 1-12 0V4Z" class="fi-fill"/><path d="M6 6H3a2 2 0 0 0 0 4h3M18 6h3a2 2 0 0 1 0 4h-3M12 16v3M8 21h8"/>',

    // Modalidades
    'footprints': '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.5v2"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.5v2"/>',
    'bike': '<circle cx="18.5" cy="17.5" r="3.5" class="fi-fill"/><circle cx="5.5" cy="17.5" r="3.5" class="fi-fill"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    'waves': '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    'calendar': '<rect width="18" height="18" x="3" y="4" rx="2" ry="2" class="fi-fill"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" class="fi-fill"/><line x1="4" x2="4" y1="22" y2="15"/>',
    'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" class="fi-fill"/>',

    // 3. Segurança & Identidade
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" class="fi-fill"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" class="fi-fill"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" class="fi-fill"/><path d="m9 12 2 2 4-4"/>',
    'fingerprint': '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
    'user': '<circle cx="12" cy="8" r="5" class="fi-fill"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3" class="fi-fill"/>',
    'eye-off': '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    'trash': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" class="fi-fill"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    'delete': '<path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" class="fi-fill"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/>',

    // 4. Plataforma & Engajamento
    'smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2" class="fi-fill"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
    'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" class="fi-fill"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" class="fi-fill"/>',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" class="fi-fill"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" class="fi-fill"/><circle cx="12" cy="12" r="2"/>'
  };

  const ALIASES = {
    'fitness_center': 'dumbbell',
    'dumb': 'dumbbell',
    'hex_dumbbell': 'dumbbell',
    'pesos': 'dumbbell',
    'barra': 'barbell',
    'olympic_bar': 'barbell',
    'restaurant': 'utensils',
    'monitor_weight': 'scale',
    'peso': 'scale',
    'bioimpedancia': 'scale',
    'smart_scale': 'scale',
    'calculate': 'calculator',
    'local_fire_department': 'flame',
    'fire': 'flame',
    'water_drop': 'water-shaker',
    'water': 'water-shaker',
    'shaker': 'water-shaker',
    'garrafa': 'water-shaker',
    'list_alt': 'clipboard-list',
    'checklist': 'clipboard-list',
    'prancheta': 'clipboard-list',
    'ficha': 'clipboard-list',
    'chevron_left': 'chevron-left',
    'chevron_right': 'chevron-right',
    'chevron_down': 'chevron-down',
    'chevron_up': 'chevron-up',
    'expand_more': 'chevron-down',
    'install_mobile': 'smartphone',
    'walk': 'footprints',
    'directions_walk': 'footprints',
    'run': 'heart-pulse',
    'directions_run': 'heart-pulse',
    'cardio': 'heart-pulse',
    'bike': 'bike',
    'directions_bike': 'bike',
    'swim': 'waves',
    'pool': 'waves',
    'rest': 'moon',
    'bedtime': 'moon',
    'bolt': 'zap',
    'accessibility_new': 'user',
    'calendar_month': 'calendar',
    'add': 'plus',
    'remove': 'minus',
    'close': 'x',
    'backspace': 'delete',
    'muscle': 'biceps',
    'braço': 'biceps',
    'fita': 'tape-measure',
    'medidas': 'tape-measure'
  };

  let activeSuite = 'duotone';
  try {
    if (typeof localStorage !== 'undefined') {
      activeSuite = localStorage.getItem('stk_icons_suite') || 'duotone';
    }
  } catch (e) {}

  function setSuite(suite) {
    if (['duotone', 'solid', 'line'].includes(suite)) {
      activeSuite = suite;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('stk_icons_suite', suite);
        }
      } catch (e) {}
      if (typeof document !== 'undefined' && document.body) {
        document.body.dataset.iconSuite = suite;
      }
    }
  }

  function getSuite() {
    return activeSuite;
  }

  function svg(name, opts = {}) {
    if (!name) return '';
    const key = ALIASES[name] || name;
    const body = PATHS[key] || PATHS['target'];
    const size = opts.size || 20;
    const stroke = opts.stroke || 2;
    const suite = opts.suite || activeSuite;
    const label = opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/[&<>"]/g, '') + '"' : ' aria-hidden="true"';
    const suiteClass = ' fi-' + suite;
    return '<svg class="fi fi-' + key + suiteClass + (opts.cls ? ' ' + opts.cls : '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + stroke + '" stroke-linecap="round" stroke-linejoin="round" focusable="false"' + label + '>' + body + '</svg>';
  }

  function hydrate(scope = document) {
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('i[data-icon]').forEach(el => {
      const html = svg(el.dataset.icon, { size: Number(el.dataset.size) || undefined, label: el.getAttribute('aria-label'), cls: el.className });
      if (html) el.outerHTML = html;
    });

    if (typeof document !== 'undefined' && (!document.body || document.body.dataset.iconMode !== 'material-symbols')) {
      scope.querySelectorAll('span.ms').forEach(el => {
        const name = el.textContent ? el.textContent.trim() : '';
        if (name) {
          const sz = 20;
          const html = svg(name, { size: sz });
          if (html) el.outerHTML = html;
        }
      });
    }

    initPasswordToggles(scope);
  }

  function initPasswordToggles(scope = document) {
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll('input[type="password"]').forEach(input => {
      if (input.dataset.hasPwToggle || input.closest('.pw-field-wrap') || input.closest('[data-pin-keypad]')) return;
      if (input.classList.contains('pin-digit') || input.maxLength === 1) return;
      input.dataset.hasPwToggle = 'true';

      const wrap = document.createElement('div');
      wrap.className = 'pw-field-wrap';
      wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;width:100%;box-sizing:border-box;';
      
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      input.style.paddingRight = '42px';
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle-btn';
      btn.setAttribute('aria-label', 'Alternar visibilidade da senha');
      btn.setAttribute('tabindex', '0');
      btn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:none;cursor:pointer;padding:6px;display:inline-flex;align-items:center;justify-content:center;color:currentColor;opacity:0.65;z-index:2;line-height:1;transition:opacity 0.2s;';
      
      btn.innerHTML = svg('eye', { size: 18 });
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '1.0'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.65'; });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password';
        btn.innerHTML = isPw ? svg('eye-off', { size: 18 }) : svg('eye', { size: 18 });
      });
      wrap.appendChild(btn);
    });
  }

  const api = { svg, hydrate, setSuite, getSuite, names: Object.keys(PATHS), aliases: ALIASES };
  root.FinancIcons = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        hydrate();
      });
    } else {
      hydrate();
    }
  }

})(globalThis);
