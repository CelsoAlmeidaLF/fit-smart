/**
 * SecurityRecoveryService.js
 * Serviço Unificado de Segurança, Derivação Mnemônica BIP39 (12 Palavras),
 * Recuperação por Hash de Validação e Emissão de Certificado PDF (Art. 11 LGPD)
 * 
 * Camada: Infrastructure / Security
 */

export class SecurityRecoveryService {
  static HASH_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  static async getWordlist() {
    if (typeof globalThis !== 'undefined' && globalThis.FINANC_BIP39_PT) {
      return globalThis.FINANC_BIP39_PT;
    }
    if (typeof globalThis !== 'undefined' && globalThis.SystekBip39Pt) {
      return globalThis.SystekBip39Pt;
    }
    // Fallback import
    try {
      const mod = await import('./stk-pkt-bip39-pt.js');
      return globalThis.FINANC_BIP39_PT || globalThis.SystekBip39Pt || mod.default || mod.words || mod;
    } catch (e) {
      if (typeof require === 'function') {
        return require('./stk-pkt-bip39-pt.js');
      }
      throw new Error('Wordlist BIP39 pt-BR não disponível.');
    }
  }

  static async getCertificateModule() {
    if (typeof globalThis !== 'undefined' && globalThis.SystekSecurityCertificate) {
      return globalThis.SystekSecurityCertificate;
    }
    try {
      const mod = await import('./stk-pkt-security-certificate.js');
      if (typeof globalThis !== 'undefined' && globalThis.SystekSecurityCertificate) {
        return globalThis.SystekSecurityCertificate;
      }
      if (mod.default && mod.default.getPrivacyPolicyContent) return mod.default;
      if (mod.getPrivacyPolicyContent) return mod;
    } catch (e) {
      if (typeof require === 'function') {
        const req = require('./stk-pkt-security-certificate.js');
        return (typeof globalThis !== 'undefined' && globalThis.SystekSecurityCertificate) || req;
      }
    }
    return (typeof globalThis !== 'undefined' && globalThis.SystekSecurityCertificate) || null;
  }

  static async sha256(bytes) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    }
    if (typeof require === 'function') {
      const nodeCrypto = require('crypto');
      return new Uint8Array(nodeCrypto.createHash('sha256').update(Buffer.from(bytes)).digest());
    }
    throw new Error('Ambiente criptográfico seguro indisponível.');
  }

  static bitsOf(bytes) {
    return Array.from(bytes, b => b.toString(2).padStart(8, '0')).join('');
  }

  static plainText(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /**
   * Gera uma nova semente criptográfica de 128 bits com 12 palavras em português e hash correspondente
   */
  static async generateSeed() {
    const entropy = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(entropy);
    } else if (typeof require === 'function') {
      const nodeCrypto = require('crypto');
      entropy.set(nodeCrypto.randomBytes(16));
    } else {
      throw new Error('RNG criptográfico seguro indisponível.');
    }

    const wordlist = await this.getWordlist();
    const digest = await this.sha256(entropy);
    const bits = this.bitsOf(entropy) + this.bitsOf(digest).slice(0, 4);
    const words = bits.match(/.{11}/g).map(chunk => wordlist[parseInt(chunk, 2)]);

    // Crockford Hash formatado
    const enc = new TextEncoder();
    const hashDigest = await this.sha256(new Uint8Array([...enc.encode('financ-hash-v1:'), ...entropy]));
    const rawHash = this.bitsOf(hashDigest).slice(0, 60).match(/.{5}/g).map(b => this.HASH_ALPHABET[parseInt(b, 2)]).join('');
    const hash = rawHash.match(/.{4}/g).join('-');

    return {
      entropy,
      words,
      hash
    };
  }

  /**
   * Valida se a frase digitada (12 palavras) ou o hash correspondem à recuperação
   */
  static async verifyRecoveryInput(input, targetHash, targetWords = []) {
    if (!input || typeof input !== 'string') return { ok: false, message: 'Digite o segredo de recuperação.' };
    const cleaned = input.trim();

    // 1. Verificação por Código Hash (ex: XXXX-XXXX-XXXX ou XXXXXXXXXXXX)
    const normInputHash = cleaned.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[IL]/g, '1').replace(/[OU]/g, '0');
    const normTargetHash = (targetHash || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[IL]/g, '1').replace(/[OU]/g, '0');

    if (normInputHash.length === 12 && normTargetHash.length === 12) {
      if (normInputHash === normTargetHash) {
        return { ok: true, method: 'hash' };
      }
      return { ok: false, message: 'O código Hash digitado não confere com o cofre deste aparelho.' };
    }

    // 2. Verificação por 12 Palavras Mnemônicas
    const typedWords = this.plainText(cleaned).split(/[^a-z]+/).filter(Boolean);
    if (typedWords.length !== 12) {
      return { ok: false, message: `Foram digitadas ${typedWords.length} palavras. É necessário digitar exatamente as 12 palavras do certificado.` };
    }

    const wordlist = await this.getWordlist();
    const targetPlain = (targetWords || []).map(w => this.plainText(w));

    // Se temos as palavras alvo salvas, compara diretamente
    if (targetPlain.length === 12) {
      const allMatch = typedWords.every((w, i) => {
        const target = targetPlain[i];
        if (w === target) return true;
        if (w.length >= 4 && target.startsWith(w)) return true;
        return false;
      });
      if (allMatch) {
        return { ok: true, method: 'words' };
      }
      return { ok: false, message: 'A frase de 12 palavras digitada não corresponde ao cofre deste aparelho.' };
    }

    // Caso não tenhamos as palavras alvo, valida se as 12 palavras pertencem ao vocabulário canônico BIP39
    const invalidWords = typedWords.filter(w => {
      let idx = wordlist.indexOf(w);
      if (idx < 0 && w.length >= 4) {
        const hits = wordlist.filter(item => item.startsWith(w.slice(0, 4)));
        if (hits.length === 1) idx = 1;
      }
      return idx < 0;
    });

    if (invalidWords.length > 0) {
      return { ok: false, message: `Palavra(s) não reconhecida(s): ${invalidWords.join(', ')}` };
    }

    return { ok: true, method: 'words' };
  }

  /**
   * Dispara o download do Certificado de Segurança A4 oficial
   */
  static async downloadSecurityCertificate({ appName, words, hash }) {
    const certModule = await this.getCertificateModule();
    if (certModule && certModule.downloadCertificatePdf) {
      certModule.downloadCertificatePdf({
        appName: appName || 'Systekna Fitness',
        words: words || [],
        hash: hash || 'XXXX-XXXX-XXXX',
        issuedAt: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
      return true;
    }
    throw new Error('Módulo gerador de certificado PDF não carregado.');
  }

  /**
   * Obtém os termos canônicos de Privacidade e Proteção de Dados (Art. 11 LGPD)
   */
  static async getPrivacyPolicy(appName) {
    const certModule = await this.getCertificateModule();
    if (certModule && certModule.getPrivacyPolicyContent) {
      return certModule.getPrivacyPolicyContent(appName);
    }

    return {
      title: `Privacidade e Proteção de Dados · ${appName}`,
      summary: 'Arquitetura Zero-Knowledge Local-First: seus dados pertencem exclusivamente a você.',
      sections: []
    };
  }

  static generateEntropyWords() {
    const entropy = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(entropy);
    }
    return { entropy, words: [] };
  }

  static async computeSeedHash(words) {
    const str = Array.isArray(words) ? words.join(' ') : String(words || '');
    const enc = new TextEncoder();
    const digest = await this.sha256(enc.encode('financ-hash-v1:' + str));
    const rawHash = this.bitsOf(digest).slice(0, 60).match(/.{5}/g).map(b => this.HASH_ALPHABET[parseInt(b, 2)]).join('');
    return rawHash.match(/.{4}/g).join('-');
  }
}
