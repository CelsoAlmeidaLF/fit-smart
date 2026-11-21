/**
 * Adaptador de Nuvem Firebase para o Ecossistema FIT (Fit Força & Fit Smart)
 * Padrão: Arquitetura Hexagonal & Zero-Knowledge Local-First
 * 
 * Responsabilidades:
 * 1. Consulta e sincronização de catálogo biomecânico (/catalogos/fit_musculos)
 * 2. Backup e sincronização de cofre do usuário (/usuarios/{uid}/fit_vault) encriptado localmente
 * 3. Operação offline-first garantida (fallback automático para catálogo local)
 */

const FIREBASE_SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';

export const DEFAULT_FIT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCQx8kJyXEReASiQMI4a5bT5NNWgtBmJpM',
  authDomain: 'systekna-fitness.firebaseapp.com',
  projectId: 'systekna-feedback', // Projeto consolidado de nuvem Systekna
  storageBucket: 'systekna-feedback.appspot.com',
  messagingSenderId: '840192837461',
  appId: '1:840192837461:web:fit_systekna_cloud_sync'
};

export class FirebaseFitnessAdapter {
  constructor(config = DEFAULT_FIT_FIREBASE_CONFIG) {
    this._config = config;
    this._app = null;
    this._firestore = null;
    this._auth = null;
    this._isInitialized = false;
  }

  /**
   * Inicialização sob demanda do SDK Firebase via módulos ESM oficiais
   */
  async initialize() {
    if (this._isInitialized) return true;

    try {
      const { initializeApp, getApps } = await import(`${FIREBASE_SDK_BASE}firebase-app.js`);
      const { getFirestore } = await import(`${FIREBASE_SDK_BASE}firebase-firestore.js`);

      const currentApps = getApps();
      this._app = currentApps.length > 0 ? currentApps[0] : initializeApp(this._config);
      this._firestore = getFirestore(this._app);
      this._isInitialized = true;
      return true;
    } catch (error) {
      console.warn('[FirebaseFitnessAdapter] Inicialização da nuvem indisponível (modo offline mantido):', error.message);
      return false;
    }
  }

  /**
   * Consulta o catálogo de músculos e exercícios na nuvem com fallback offline
   * @param {Array} localCatalog Catálogo embutido local de fallback
   * @returns {Promise<Array>} Lista de 41 músculos estruturados
   */
  async getMuscleCatalog(localCatalog = []) {
    const ready = await this.initialize();
    if (!ready || !this._firestore) {
      return localCatalog;
    }

    try {
      const { collection, getDocs } = await import(`${FIREBASE_SDK_BASE}firebase-firestore.js`);
      const colRef = collection(this._firestore, 'fit_catalog_muscles');
      const snap = await getDocs(colRef);

      if (snap.empty) {
        return localCatalog;
      }

      const items = [];
      snap.forEach(doc => items.push(doc.data()));
      return items.length ? items : localCatalog;
    } catch (e) {
      console.warn('[FirebaseFitnessAdapter] Falha ao consultar catálogo na nuvem. Usando catálogo local:', e.message);
      return localCatalog;
    }
  }

  /**
   * Sincronização segura de cofre em nuvem (Zero-Knowledge)
   * O payload DEVE estar criptografado com chave derivada do PIN do atleta
   * @param {string} userId Identificador anônimo ou UUID do usuário
   * @param {object} encryptedVaultPayload Objeto com ciphertext, iv, salt e versão
   * @returns {Promise<boolean>} Sucesso da persistência
   */
  async syncEncryptedVault(userId, encryptedVaultPayload) {
    if (!userId || !encryptedVaultPayload || !encryptedVaultPayload.ciphertext) {
      throw new Error('[FirebaseFitnessAdapter] O payload do cofre precisa estar criptografado para sincronização em nuvem.');
    }

    const ready = await this.initialize();
    if (!ready || !this._firestore) {
      throw new Error('[FirebaseFitnessAdapter] Conexão com Firebase indisponível.');
    }

    try {
      const { doc, setDoc, serverTimestamp } = await import(`${FIREBASE_SDK_BASE}firebase-firestore.js`);
      const docRef = doc(this._firestore, 'usuarios', userId, 'fit_vault', 'current');
      
      await setDoc(docRef, {
        ...encryptedVaultPayload,
        updatedAt: serverTimestamp(),
        clientVersion: '1.6.0',
        app: 'stk-crm-fitness'
      }, { merge: true });

      return true;
    } catch (e) {
      console.error('[FirebaseFitnessAdapter] Erro ao sincronizar cofre cifrado no Firestore:', e);
      return false;
    }
  }

  /**
   * Recuperação do cofre criptografado em nuvem
   * @param {string} userId Identificador anônimo ou UUID do usuário
   * @returns {Promise<object|null>} Payload criptografado ou null
   */
  async getEncryptedVault(userId) {
    if (!userId) return null;

    const ready = await this.initialize();
    if (!ready || !this._firestore) return null;

    try {
      const { doc, getDoc } = await import(`${FIREBASE_SDK_BASE}firebase-firestore.js`);
      const docRef = doc(this._firestore, 'usuarios', userId, 'fit_vault', 'current');
      const snap = await getDoc(docRef);

      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn('[FirebaseFitnessAdapter] Erro ao recuperar cofre na nuvem:', e.message);
      return null;
    }
  }
}
