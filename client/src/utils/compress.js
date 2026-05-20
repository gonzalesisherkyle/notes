// client/src/utils/compress.js
import pako from 'pako';

/**
 * Compress a string using deflate and return URL-safe Base64.
 * @param {string} str - The string to compress
 * @returns {string} URL-safe base64-encoded compressed data
 */
export function compressToBase64Url(str) {
  const bytes = pako.deflate(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decompress a URL-safe Base64 string back to the original string.
 * @param {string} base64Url - URL-safe base64-encoded compressed data
 * @returns {string} The original uncompressed string
 */
export function decompressFromBase64Url(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return pako.inflate(bytes, { to: 'string' });
}
