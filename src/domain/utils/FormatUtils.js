/**
 * Utilitários Canônicos de Formatação (Domínio Puro)
 */
export class FormatUtils {
  static escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[c]));
  }

  static formatNumber(n, decimals = 0) {
    return Number(n ?? 0).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  static formatDateBr(isoDate) {
    return String(isoDate || '').split('-').reverse().join('/');
  }

  static getTodayIso() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  static generateUid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
}
