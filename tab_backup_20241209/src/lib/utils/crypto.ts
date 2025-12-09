/**
 * Secure storage for API keys using Web Crypto API
 */
export class SecureStorage {
  /**
   * Generate encryption key based on extension ID
   */
  private static async getEncryptionKey(): Promise<CryptoKey> {
    const extensionId = chrome.runtime.id;
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(extensionId),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('bookmark-extension-salt-v1'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt API key
   */
  static async encryptAPIKey(apiKey: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(apiKey);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );

      // Combine IV and ciphertext
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt API key
   */
  static async decryptAPIKey(encryptedKey: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }
}
