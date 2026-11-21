import { LocalStorageFitSmartAdapter } from './infrastructure/storage/LocalStorageFitSmartAdapter.js';
import { HealthProfileService } from './application/services/HealthProfileService.js';
import { WorkoutDietService } from './application/services/WorkoutDietService.js';
import { BottomSheet } from './ui/components/BottomSheet.js';
import { Toast } from './ui/components/Toast.js';
import { AppController } from './ui/controllers/AppController.js';

/**
 * Entrypoint Canônico da Aplicação Fit Smart
 * Arquitetura Hexagonal com Injeção de Dependência via Construtor (SOLID)
 */
export class Program {
  constructor() {
    // 1. Camada de Infraestrutura (Storage Adapter)
    this.storageAdapter = new LocalStorageFitSmartAdapter();

    // 2. Camada de Aplicação (Services)
    this.healthService = new HealthProfileService(this.storageAdapter);
    this.workoutDietService = new WorkoutDietService(this.storageAdapter);

    // 3. Componentes de UI Reutilizáveis
    this.bottomSheet = new BottomSheet(
      typeof document !== 'undefined' ? document.querySelector('#scrim') : null,
      typeof document !== 'undefined' ? document.querySelector('#sheet') : null
    );
    this.toast = new Toast(
      typeof document !== 'undefined' ? document.querySelector('#toast') : null
    );

    // 4. Controller Central de Interface (Injeção de Dependências)
    this.appController = new AppController({
      storageAdapter: this.storageAdapter,
      healthService: this.healthService,
      workoutDietService: this.workoutDietService,
      bottomSheet: this.bottomSheet,
      toast: this.toast
    });
  }

  start() {
    console.info('[Fit Smart] Aplicação inicializada com arquitetura hexagonal canônica.');
    if (typeof window !== 'undefined') {
      this.appController.init();
      this.registerServiceWorker();
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('[Fit Smart] Falha ao registrar Service Worker:', err);
      });
    }
  }
}

// Alias Canônico de Retrocompatibilidade
export const App = Program;

// Inicialização segura no carregamento do DOM
if (typeof window !== 'undefined') {
  const boot = () => {
    window.program = new Program();
    window.program.start();
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
