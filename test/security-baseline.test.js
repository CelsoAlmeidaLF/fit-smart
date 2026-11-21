/**
 * @file security-baseline.test.js
 * @description Testes automatizados para validação da baseline de segurança em Fit Force:
 * - Auditoria com Hash SHA-256
 * - Higienização de PII
 * - Zeroization de memória
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const AuditTrailPkg = require('../src/infrastructure/security/stk-pkt-audit-trail.js');
const PiiSanitizerPkg = require('../src/infrastructure/security/stk-pkt-pii-sanitizer.js');
const FinancVaultPkg = require('../src/infrastructure/security/stk-pkt-secure-vault.js');

const AuditLedger = AuditTrailPkg.AuditLedger || (AuditTrailPkg.default && AuditTrailPkg.default.AuditLedger) || (globalThis.SystekAuditTrail && globalThis.SystekAuditTrail.AuditLedger) || AuditTrailPkg;
const PiiSanitizer = PiiSanitizerPkg.sanitize ? PiiSanitizerPkg : (globalThis.SystekPiiSanitizer || PiiSanitizerPkg);
const FinancVault = FinancVaultPkg.Vault ? FinancVaultPkg : (globalThis.FinancVault || FinancVaultPkg);

test('Fit Force - Trilha de auditoria encadeada para registros de treino', async () => {
  const store = {};
  const mockStorage = {
    async getItem(k) { return store[k] || null; },
    async setItem(k, v) { store[k] = v; }
  };

  const ledger = new AuditLedger(mockStorage, 'workout_audit_ledger');
  const b0 = await ledger.appendEvent('WORKOUT_SESSION_START', { planId: 'ficha-a', athlete: 'Celso' });
  assert.equal(b0.index, 0);

  const b1 = await ledger.appendEvent('WORKOUT_SET_COMPLETED', { exercise: 'Supino Reto', weightKg: 100, reps: 10 });
  assert.equal(b1.index, 1);
  assert.equal(b1.previousHash, b0.currentHash);

  const check = await ledger.verifyIntegrity();
  assert.equal(check.valid, true);
  assert.equal(check.blocksCount, 2);
});

test('Fit Force - Higienização de PII em logs e anotações do atleta', () => {
  const dirty = 'Atleta CPF 123.456.789-00 relatou dor articular após treino. Contato: celso@systekna.com';
  const clean = PiiSanitizer.sanitizeString(dirty);

  assert.ok(!clean.includes('123.456.789-00'));
  assert.ok(!clean.includes('celso@systekna.com'));
  assert.ok(clean.includes('[CPF_OCULTADO]'));
  assert.ok(clean.includes('[EMAIL_OCULTADO]'));
});

test('Fit Force - Destruição de buffers sensíveis na memória (Zeroization)', () => {
  const buf = new Uint8Array([1, 2, 3, 4, 5]);
  FinancVault.zeroize(buf);
  assert.equal(buf[0], 0);
  assert.equal(buf[4], 0);
});
