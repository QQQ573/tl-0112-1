import CryptoJS from 'crypto-js';

const MASTER_PASSWORD_HASH = 'b7a6a2862f3d0255b6e8f9a6d63d8e2b1e2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d';

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

export const MASTER_PASSWORD_HINT = '主管口令：请联系管理员获取';
