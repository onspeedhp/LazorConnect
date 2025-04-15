import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Decrypts a payload from Phantom using the shared secret
 * 
 * @param data The encrypted data from Phantom
 * @param nonce The nonce used for encryption
 * @param sharedSecret The shared secret to decrypt with
 * @returns The decrypted payload
 */
export const decryptPayload = (
  data: string,
  nonce: string,
  sharedSecret: Uint8Array
): any => {
  if (!sharedSecret) throw new Error('Shared secret is required');

  const decryptedData = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );

  if (!decryptedData) {
    throw new Error('Unable to decrypt data');
  }

  const decoder = new TextDecoder();
  const decoded = decoder.decode(decryptedData);

  return JSON.parse(decoded);
};