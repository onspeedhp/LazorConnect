import '../buffer-polyfill';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Encrypts a payload using the shared secret
 */
export function encryptPayload(
  payload: any,
  sharedSecret: Uint8Array
): [Uint8Array, Uint8Array] {
  if (!sharedSecret) throw new Error('Missing shared secret');

  const nonce = nacl.randomBytes(24);
  const messageUint8 = new TextEncoder().encode(JSON.stringify(payload));
  const encryptedPayload = nacl.box.after(messageUint8, nonce, sharedSecret);

  return [nonce, encryptedPayload];
}

/**
 * Builds URL for Phantom deep linking
 */
export function buildUrl(path: string, params: URLSearchParams): string {
  return `https://phantom.app/ul/${path}?${params.toString()}`;
}