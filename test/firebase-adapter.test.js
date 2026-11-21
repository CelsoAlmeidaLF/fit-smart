import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FirebaseFitnessAdapter } from '../src/infrastructure/storage/FirebaseFitnessAdapter.js';

describe('FirebaseFitnessAdapter - Testes de Contrato e Fallback Local-First', () => {
  test('Deve instanciar com configuração padrão e estado não-inicializado', () => {
    const adapter = new FirebaseFitnessAdapter();
    assert.strictEqual(adapter._isInitialized, false);
    assert.strictEqual(adapter._config.projectId, 'systekna-feedback');
  });

  test('Deve retornar catálogo local de fallback quando nuvem estiver offline ou indisponível', async () => {
    const adapter = new FirebaseFitnessAdapter({
      apiKey: 'INVALID_TEST_KEY',
      projectId: 'invalid-test-proj'
    });

    const localCatalog = [
      { id: 'peitoral-maior', n: 'Peitoral Maior', h: 48 },
      { id: 'latissimo-do-dorso', n: 'Dorsal', h: 48 }
    ];

    const result = await adapter.getMuscleCatalog(localCatalog);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, 'peitoral-maior');
  });

  test('Deve rejeitar sincronização de cofre se payload não for criptografado', async () => {
    const adapter = new FirebaseFitnessAdapter();
    await assert.rejects(
      async () => {
        await adapter.syncEncryptedVault('user-123', { textoPlano: 'minhas_cargas' });
      },
      /O payload do cofre precisa estar criptografado/
    );
  });
});
