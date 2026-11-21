/**
 * Adaptador de Segurança Local: Hashing de PIN e Autenticação Biométrica (WebAuthn)
 */
export class BiometricsAdapter {
  static async hashPin(pinString) {
    try {
      const msgUint8 = new TextEncoder().encode('fit-systekna:' + pinString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('[BiometricsAdapter] Fallback SHA-256:', e);
      return btoa('fit:' + pinString);
    }
  }

  static isValidPinFormat(pinString) {
    return /^\d{4,6}$/.test(String(pinString || ''));
  }

  static bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  static base64ToBuffer(base64) {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  static async isAvailable() {
    try {
      return !!(
        window.PublicKeyCredential &&
        window.isSecureContext &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      );
    } catch (e) {
      return false;
    }
  }

  static async registerCredential() {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Fit Systekna' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'usuario',
          displayName: 'Usuário'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        },
        timeout: 60000
      }
    });
    return this.bufferToBase64(cred.rawId);
  }

  static async verifyCredential(credentialIdBase64) {
    if (!credentialIdBase64) return false;
    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [
            {
              type: 'public-key',
              id: this.base64ToBuffer(credentialIdBase64),
              transports: ['internal']
            }
          ],
          userVerification: 'required',
          timeout: 60000
        }
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}
