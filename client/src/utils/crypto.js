// client/src/utils/crypto.js

/**
 * Encrypts a note object with a password using PBKDF2 + AES-GCM 256
 * @param {Object} noteObject { title, body, tags }
 * @param {string} password The keyphrase
 * @returns {Promise<string>} Base64URL-encoded ciphertext
 */
export async function encryptNote(noteObject, password) {
  const encoder = new TextEncoder();
  const noteText = JSON.stringify(noteObject);
  
  // Generate random salt and IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Import raw password bytes
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM 256 key
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(noteText)
  );
  
  // Pack: [16-byte salt] [12-byte IV] [ciphertext]
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  return arrayBufferToBase64Url(combined);
}

/**
 * Decrypts a Base64URL-encoded note string using the password
 * @param {string} encryptedBase64 The packaged ciphertext string
 * @param {string} password The keyphrase
 * @returns {Promise<Object>} Decrypted note { title, body, tags }
 */
export async function decryptNote(encryptedBase64, password) {
  try {
    const bytes = base64UrlToArrayBuffer(encryptedBase64);
    if (bytes.length < 28) {
      throw new Error('Invalid payload size');
    }
    
    // Extract parameters
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const ciphertext = bytes.slice(28);
    
    const encoder = new TextEncoder();
    
    // Import raw password
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derive key
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text);
  } catch (e) {
    console.error('Decryption failed', e);
    throw new Error('Incorrect password or corrupted data');
  }
}

// Helper: Convert array buffer to URL-safe Base64
function arrayBufferToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helper: Convert URL-safe Base64 back to Uint8Array
function base64UrlToArrayBuffer(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
