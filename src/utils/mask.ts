import CryptoJS from 'crypto-js';

const MASTER_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

export function maskAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 4) return '****';
  const prefix = address.slice(0, 3);
  const suffix = address.slice(-2);
  const maskedLength = Math.max(address.length - 5, 4);
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

export function verifyMasterPassword(password: string): boolean {
  const hash = CryptoJS.SHA256(password).toString();
  return hash === MASTER_PASSWORD_HASH;
}

export const MASTER_PASSWORD_HINT = '默认测试口令：admin123（部署前请修改）';
