/**
 * Modelo Matemático de Fadiga Muscular e Recuperação por Volume
 */
export class MuscleRecoveryModel {
  static STATUS_LABELS = {
    ok: 'Pronto',
    warn: 'Quase pronto',
    bad: 'Recuperando',
    new: 'Sem registro'
  };

  static STATUS_ICONS = {
    ok: 'check',
    warn: 'clock',
    bad: 'moon',
    new: 'minus'
  };

  static MUSCLE_IMAGE_MAP = {
    'peitoral-maior': 'assets/musculos/04_peitoral_ombros_pescoco/14_peitoral_maior.jpg',
    'deltoides-geral': 'assets/musculos/04_peitoral_ombros_pescoco/15_deltoides_geral.jpg',
    'deltoide-anterior': 'assets/musculos/04_peitoral_ombros_pescoco/16_deltoide_anterior.jpg',
    'deltoide-lateral': 'assets/musculos/04_peitoral_ombros_pescoco/17_deltoide_lateral.jpg',
    'esternocleidomastoideo-pescoco': 'assets/musculos/04_peitoral_ombros_pescoco/18_esternocleidomastoideo_pescoco.jpg',
    'latissimo-do-dorso': 'assets/musculos/05_costas_manguito_rotador/19_latissimo_do_dorso.jpg',
    'trapezio': 'assets/musculos/05_costas_manguito_rotador/20_trapezio.jpg',
    'romboides': 'assets/musculos/05_costas_manguito_rotador/21_romboides.jpg',
    'eretor-da-espinha': 'assets/musculos/05_costas_manguito_rotador/22_eretor_da_espinha.jpg',
    'quadrado-lombar': 'assets/musculos/05_costas_manguito_rotador/23_quadrado_lombar.jpg',
    'redondo-maior-deltoide-posterior': 'assets/musculos/05_costas_manguito_rotador/24_redondo_maior_deltoide_posterior.jpg',
    'supraespinal': 'assets/musculos/05_costas_manguito_rotador/25_supraespinal.jpg',
    'infraespinal': 'assets/musculos/05_costas_manguito_rotador/26_infraespinal.jpg',
    'redondo-menor': 'assets/musculos/05_costas_manguito_rotador/27_redondo_menor.jpg',
    'reto-abdominal': 'assets/musculos/06_abdomen_core/28_reto_abdominal.jpg',
    'obliquos-externos': 'assets/musculos/06_abdomen_core/29_obliquos_externos.jpg',
    'transverso-do-abdomen': 'assets/musculos/06_abdomen_core/30_transverso_do_abdomen.jpg',
    'serratil-anterior': 'assets/musculos/06_abdomen_core/31_serratil_anterior.jpg',
    'biceps-braquial': 'assets/musculos/07_bracos_antebracos/32_biceps_braquial.jpg',
    'coracobraquial-cabeca-curta-biceps': 'assets/musculos/07_bracos_antebracos/33_coracobraquial_cabeca_curta_biceps.jpg',
    'braquial': 'assets/musculos/07_bracos_antebracos/34_braquial.jpg',
    'triceps-braquial-geral': 'assets/musculos/07_bracos_antebracos/35_triceps_braquial_geral.jpg',
    'cabeca-longa-triceps': 'assets/musculos/07_bracos_antebracos/36_cabeca_longa_triceps.jpg',
    'antebraco-geral': 'assets/musculos/07_bracos_antebracos/37_antebraco_geral.jpg',
    'braquiorradial': 'assets/musculos/07_bracos_antebracos/38_braquiorradial.jpg',
    'flexores-do-antebraco': 'assets/musculos/07_bracos_antebracos/39_flexores_do_antebraco.jpg',
    'extensores-do-antebraco': 'assets/musculos/07_bracos_antebracos/40_extensores_do_antebraco.jpg',
    'gluteo-maximo': 'assets/musculos/08_gluteos_quadril_coxas/41_gluteo_maximo.jpg',
    'gluteo-medio': 'assets/musculos/08_gluteos_quadril_coxas/42_gluteo_medio.jpg',
    'tensor-da-fascia-lata': 'assets/musculos/08_gluteos_quadril_coxas/43_tensor_da_fascia_lata.jpg',
    'quadriceps-geral': 'assets/musculos/08_gluteos_quadril_coxas/44_quadriceps_geral.jpg',
    'vasto-medial': 'assets/musculos/08_gluteos_quadril_coxas/45_vasto_medial.jpg',
    'isquiotibiais-geral': 'assets/musculos/08_gluteos_quadril_coxas/46_isquiotibiais_geral.jpg',
    'biceps-femoral': 'assets/musculos/08_gluteos_quadril_coxas/47_biceps_femoral.jpg',
    'adutores-da-coxa': 'assets/musculos/08_gluteos_quadril_coxas/48_adutores_da_coxa.jpg',
    'gracil': 'assets/musculos/08_gluteos_quadril_coxas/49_gracil.jpg',
    'sartorio': 'assets/musculos/08_gluteos_quadril_coxas/50_sartorio.jpg',
    'gastrocnemio': 'assets/musculos/09_pernas_panturrilhas/51_gastrocnemio.jpg',
    'soleo': 'assets/musculos/09_pernas_panturrilhas/52_soleo.jpg',
    'tibial-anterior': 'assets/musculos/09_pernas_panturrilhas/53_tibial_anterior.jpg',
    'fibulares-longo-e-curto': 'assets/musculos/09_pernas_panturrilhas/54_fibulares_longo_e_curto.jpg'
  };

  static getMuscleIconPath(muscleId) {
    return this.MUSCLE_IMAGE_MAP[muscleId] || null;
  }

  static getStatusIconSvg(key) {
    switch (key) {
      case 'ok':
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
      case 'warn':
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      case 'bad':
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
      default:
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    }
  }

  /**
   * Calcula a fadiga acumulada em cada músculo a partir do histórico de treinos
   */
  static computeFatigue(workouts = [], musclesById = {}, customRecoveryHours = {}) {
    const fatigue = {};

    for (const w of workouts) {
      const volume = {};
      const exList = w.exercises || w.ex || [];

      exList.forEach(e => {
        const setsCount = (e.sets || []).length;
        if (!setsCount) return;

        const pMuscle = e.primaryMuscleId || e.m;
        if (pMuscle) {
          volume[pMuscle] = (volume[pMuscle] || 0) + setsCount;
        }

        const secMuscles = e.secondaryMuscleIds || e.sec || [];
        secMuscles.forEach(x => {
          volume[x] = (volume[x] || 0) + setsCount * 0.5; // Sinérgicos recebem 50% de volume
        });
      });

      const wTime = Number(w.timestamp || w.t) || Date.now();

      for (const id in volume) {
        const muscle = musclesById[id];
        if (!muscle) continue;

        const baseHours = customRecoveryHours[id] || muscle.h || muscle.recoveryHours || 48;
        // Fator de escala volumétrica: entre 0.6x (baixo volume) e 1.4x (alto volume)
        const scaleFactor = Math.max(0.6, Math.min(1.4, 0.45 + 0.18 * volume[id]));
        const recoveryEnd = wTime + baseHours * 3600 * 1000 * scaleFactor;

        if (!fatigue[id] || recoveryEnd > fatigue[id].end) {
          fatigue[id] = {
            timestamp: wTime,
            end: recoveryEnd,
            volume: volume[id]
          };
        }
      }
    }

    return fatigue;
  }

  /**
   * Obtém o estado de prontidão de um músculo específico considerando overrides manuais
   */
  static getMuscleStatus(muscleId, fatigueMap = {}, manualOverrides = {}, now = Date.now()) {
    const override = manualOverrides[muscleId];
    const fatigue = fatigueMap[muscleId];

    // Verificar se override expirou ou foi superado por novo treino
    if (override) {
      if ((fatigue && fatigue.timestamp > override.t) || (override.ate && now > override.ate)) {
        // Expirou
      } else {
        const remainingHours = override.ate ? Math.max(1, Math.ceil((override.ate - now) / 3600000)) : null;
        return {
          key: override.k,
          label: `${this.STATUS_LABELS[override.k] || override.k} (ajustado${remainingHours ? ', ' + remainingHours + ' h' : ''})`,
          percent: override.k === 'ok' ? 1.0 : override.k === 'warn' ? 0.75 : 0.25,
          remainingHours,
          isManual: true,
          volume: fatigue && fatigue.volume
        };
      }
    }

    if (!fatigue) {
      return { key: 'new', label: 'Sem registro', percent: 0, remainingHours: 0, isManual: false };
    }

    const left = fatigue.end - now;
    if (left <= 0) {
      return { key: 'ok', label: 'Pronto', percent: 1.0, remainingHours: 0, isManual: false, volume: fatigue.volume };
    }

    const totalDuration = fatigue.end - fatigue.timestamp;
    const progress = totalDuration > 0 ? 1 - left / totalDuration : 1;
    const remainingHours = Math.ceil(left / 3600000);

    const isBad = progress < 0.5;
    const key = isBad ? 'bad' : 'warn';
    const label = `${isBad ? 'Recuperando' : 'Quase pronto'} · ${remainingHours} h`;

    return {
      key,
      label,
      percent: progress,
      remainingHours,
      isManual: false,
      volume: fatigue.volume
    };
  }
}
