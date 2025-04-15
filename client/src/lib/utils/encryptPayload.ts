import nacl from 'tweetnacl';

/**
 * Encrypts a payload with the provided shared secret
 * 
 * @param payload The payload to encrypt
 * @param sharedSecret The shared secret to encrypt with
 * @returns A tuple of [nonce, encryptedPayload]
 */
export const encryptPayload = (
  payload: any,
  sharedSecret: Uint8Array
): [Uint8Array, Uint8Array] => {
  if (!sharedSecret) throw new Error('Shared secret is required');

  const nonce = nacl.randomBytes(24);
  
  const messageUint8 = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedPayload = nacl.box.after(messageUint8, nonce, sharedSecret);

  return [nonce, encryptedPayload];
};