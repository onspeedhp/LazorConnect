import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Decrypts the payload from a Phantom connection/transaction response
 */
export function decryptPayload(
  data: string,
  nonce: string,
  sharedSecret: Uint8Array
): any {
  if (!sharedSecret) throw new Error('Missing shared secret');
  
  const decryptedData = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );
  
  if (!decryptedData) {
    throw new Error('Unable to decrypt data');
  }
  
  const decodedData = new TextDecoder().decode(decryptedData);
  return JSON.parse(decodedData);
}