import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityRecoveryService } from '../src/infrastructure/security/SecurityRecoveryService.js';

test('SecurityRecoveryService - Deve gerar semente de 12 palavras e Hash no padrão canônico', async () => {
  const seed = await SecurityRecoveryService.generateSeed();
  assert.equal(Array.isArray(seed.words), true, 'Deve gerar array de palavras');
  assert.equal(seed.words.length, 12, 'Deve ter exatamente 12 palavras BIP39');
  assert.equal(typeof seed.hash, 'string', 'Deve ter hash');
  assert.match(seed.hash, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/, 'Hash deve estar no formato XXXX-XXXX-XXXX');
});

test('SecurityRecoveryService - Validação de recuperação por Hash', async () => {
  const seed = await SecurityRecoveryService.generateSeed();
  
  // Validação positiva com e sem hífen, case-insensitive
  const res1 = await SecurityRecoveryService.verifyRecoveryInput(seed.hash, seed.hash, seed.words);
  assert.equal(res1.ok, true, 'Hash exato deve ser aceito');

  const rawClean = seed.hash.replace(/-/g, '').toLowerCase();
  const res2 = await SecurityRecoveryService.verifyRecoveryInput(rawClean, seed.hash, seed.words);
  assert.equal(res2.ok, true, 'Hash sem hífen e minúsculo deve ser aceito');

  // Validação negativa com hash diferente
  const res3 = await SecurityRecoveryService.verifyRecoveryInput('0000-1111-2222', seed.hash, seed.words);
  assert.equal(res3.ok, false, 'Hash incorreto deve ser rejeitado');
});

test('SecurityRecoveryService - Validação de recuperação por 12 palavras', async () => {
  const seed = await SecurityRecoveryService.generateSeed();

  // Validação com frase exata
  const phrase = seed.words.join(' ');
  const res1 = await SecurityRecoveryService.verifyRecoveryInput(phrase, seed.hash, seed.words);
  assert.equal(res1.ok, true, 'Frase exata deve ser aceita');

  // Validação negativa com palavras a menos
  const res2 = await SecurityRecoveryService.verifyRecoveryInput('palavra1 palavra2', seed.hash, seed.words);
  assert.equal(res2.ok, false, 'Menos de 12 palavras deve ser rejeitado');

  // Validação negativa com palavra fora da lista BIP39
  const fakePhrase = 'palavrafalsa1 palavrafalsa2 palavrafalsa3 palavrafalsa4 palavrafalsa5 palavrafalsa6 palavrafalsa7 palavrafalsa8 palavrafalsa9 palavrafalsa10 palavrafalsa11 palavrafalsa12';
  const res3 = await SecurityRecoveryService.verifyRecoveryInput(fakePhrase, seed.hash, seed.words);
  assert.equal(res3.ok, false, 'Palavras falsas devem ser rejeitadas');
});

test('SecurityRecoveryService - Termos de Privacidade e Proteção de Dados LGPD', async () => {
  const policy = await SecurityRecoveryService.getPrivacyPolicy('Fit Força');
  assert.ok(policy.title.includes('Fit Força'), 'Título deve conter o nome do app');
  assert.equal(policy.sections.length, 5, 'Deve conter as 5 seções canônicas de privacidade e LGPD');
});
