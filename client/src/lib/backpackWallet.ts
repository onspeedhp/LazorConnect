/**
 * Backpack Wallet integration utility
 * Provides methods for connecting to Backpack wallet, signing transactions, and managing sessions
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import './buffer-polyfill'; // Ensure Buffer is available
import bs58 from 'bs58';

// Use proper bs58 encoding/decoding as per Backpack documentation
// Base58 is required for Backpack wallet compatibility
function arrayToBase58(array: Uint8Array): string {
  return bs58.encode(array);
}

function base58ToArray(base58Str: string): Uint8Array {
  return bs58.decode(base58Str);
}

/**
 * Backpack wallet connection handler
 */
class BackpackWallet {
  private static instance: BackpackWallet;
  private dappKeyPair = nacl.box.keyPair();
  private session: string | null = null;
  private walletPublicKey: PublicKey | null = null;
  private connection: Connection;
  private isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  private constructor() {
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Log the redirect URLs for debugging
    // Make sure we use the correct port (5000) for redirects
    const baseUrl = window.location.origin.replace(/:3000\b/, ':5000');
    const redirectLinks = {
      connect: `${baseUrl}/?backpack=connect`,
      transaction: `${baseUrl}/?backpack=transaction`,
      disconnect: `${baseUrl}/?backpack=disconnect`,
    };
    
    console.log('Backpack redirect links configured:', redirectLinks);
  }
  
  public static getInstance(): BackpackWallet {
    if (!BackpackWallet.instance) {
      BackpackWallet.instance = new BackpackWallet();
    }
    return BackpackWallet.instance;
  }
  
  /**
   * Creates a deep link URL to connect to Backpack
   */
  public connect(): string {
    // Create a new key pair for this session
    this.dappKeyPair = nacl.box.keyPair();
    
    // Detect device platform for platform-specific handling
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Get baseUrl with correct port
    const baseUrl = window.location.origin.replace(/:3000\b/, ':5000');
    
    // Create direct redirect URL to our app (no special handling in connect needed)
    // The redirect_link parameter should be our app URL where Backpack will redirect after connection
    const redirectUrl = baseUrl + '/?backpack=connect';
    
    // According to Backpack docs, the redirect_link must be URL-encoded
    const encodedRedirectUrl = encodeURIComponent(redirectUrl);
    
    // Convert the public key to base58 as required by Backpack
    const publicKeyBase58 = arrayToBase58(this.dappKeyPair.publicKey);
    
    // Create connection URL parameters
    const params = new URLSearchParams({
      dapp_encryption_public_key: publicKeyBase58,
      cluster: 'devnet', // Use devnet for testing
      redirect_link: encodedRedirectUrl,
      app_url: encodeURIComponent(baseUrl), // Required: URL that provides app metadata
    });
    
    // Form the URL - using the correct base URL as specified in docs
    const url = `https://backpack.app/ul/v1/connect?${params.toString()}`;
    
    console.log('Connecting to Backpack with URL:', url);
    
    // Now use the previously detected iOS flag
    
    if (isIOS) {
      // On iOS, we use the universal link fallback mechanism that will return to Safari
      // iOS needs this special handling to return to Safari after the wallet operation
      window.location.href = `https://backpack.app/return?address_=_skip_&redirect_link=${encodeURIComponent(url)}`;
    } else {
      // On other platforms, we can open the URL directly
      window.location.href = url;
    }
    
    return url;
  }
  
  /**
   * Handles the response from Backpack after a connection attempt
   */
  public handleConnectResponse(url: URL): string | null {
    try {
      console.log('Handling Backpack connect response, URL params:', 
        Object.fromEntries(url.searchParams.entries()));
      
      // Extract response parameters
      const data = url.searchParams.get('data');
      const wallet_encryption_public_key = url.searchParams.get('wallet_encryption_public_key');
      const nonce = url.searchParams.get('nonce');
      this.session = url.searchParams.get('session');
      
      // There are two ways Backpack might return the public key:
      // 1. Direct wallet_public_key parameter (older versions)
      // 2. Encrypted in the data parameter (newer versions)
      
      // Check for direct public key first
      const direct_wallet_public_key = url.searchParams.get('wallet_public_key');
      if (direct_wallet_public_key && this.session) {
        console.log('Using direct public key from Backpack response');
        this.walletPublicKey = new PublicKey(direct_wallet_public_key);
        return direct_wallet_public_key;
      }
      
      // If we have encrypted data, decrypt it
      if (data && wallet_encryption_public_key && nonce && this.session) {
        console.log('Decrypting public key from Backpack response');
        
        try {
          // Decode parameters
          const walletEncPubKeyBytes = base58ToArray(wallet_encryption_public_key);
          const nonceBytes = base58ToArray(nonce);
          const encryptedDataBytes = base58ToArray(data);
          
          // Create shared secret from wallet's public key and our private key
          const sharedSecret = nacl.box.before(
            walletEncPubKeyBytes,
            this.dappKeyPair.secretKey
          );
          
          // Decrypt the data
          const decrypted = this.decryptPayload(
            encryptedDataBytes,
            nonceBytes,
            sharedSecret
          );
          
          if (decrypted) {
            // Parse the decrypted JSON
            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(decrypted);
            console.log('Decrypted data JSON:', jsonStr);
            const parsedData = JSON.parse(jsonStr);
            
            // Extract the public key from the decrypted data
            if (parsedData && parsedData.public_key) {
              this.walletPublicKey = new PublicKey(parsedData.public_key);
              return parsedData.public_key;
            }
          }
        } catch (decryptError) {
          console.error('Error decrypting Backpack connect response:', decryptError);
        }
      }
      
      console.error('Missing or invalid parameters in Backpack connect response');
      return null;
    } catch (error) {
      console.error('Error handling Backpack connect response:', error);
      return null;
    }
  }
  
  /**
   * Disconnects from Backpack wallet
   */
  public disconnect(): void {
    this.session = null;
    this.walletPublicKey = null;
    
    // Get baseUrl with correct port
    const baseUrl = window.location.origin.replace(/:3000\b/, ':5000');
    
    // No need to go through Backpack app for disconnection - we can just redirect locally 
    // to clear URL parameters and allow the BackpackResponseHandler to manage the state
    const redirectLink = baseUrl + '/?backpack=disconnect';
    
    console.log('Disconnecting from Backpack wallet');
    window.location.href = redirectLink;
  }
  
  /**
   * Signs and sends a transaction via Backpack
   */
  public signAndSendTransaction(transaction: Transaction): string {
    try {
      // Check if connected
      if (!this.isConnected() || !this.session) {
        throw new Error('Not connected to Backpack wallet');
      }
      
      // Serialize the transaction
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });
      
      // Get baseUrl with correct port
      const baseUrl = window.location.origin.replace(/:3000\b/, ':5000');
      
      // According to Backpack docs, we need a direct redirect URL
      const redirectUrl = baseUrl + '/?backpack=transaction';
      
      // The docs specify redirect_link must be URL-encoded
      const encodedRedirectUrl = encodeURIComponent(redirectUrl);
      
      // Generate a nonce for encryption
      const nonce = nacl.randomBytes(24);
      
      // Prepare the payload object
      const payload = {
        transaction: arrayToBase58(serializedTransaction),
        session: this.session
        // sendOptions is optional, we'll omit it for now
      };
      
      // Convert payload to JSON string
      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(JSON.stringify(payload));
      
      // We need the wallet public key for encryption, which should be available since we're connected
      if (!this.walletPublicKey) {
        throw new Error('Wallet public key not available');
      }
      
      // Create shared secret using wallet's public key
      const walletPubKeyBytes = this.walletPublicKey.toBytes().slice(0, 32);
      const sharedSecret = nacl.box.before(
        walletPubKeyBytes,
        this.dappKeyPair.secretKey
      );
      
      // Encrypt the payload
      const encryptedPayload = nacl.box.after(
        payloadBytes,
        nonce,
        sharedSecret
      );
      
      if (!encryptedPayload) {
        throw new Error('Failed to encrypt transaction payload');
      }
      
      // Form the URL - using the correct URL as specified in docs
      const url = `https://backpack.app/ul/v1/signAndSendTransaction?${new URLSearchParams({
        dapp_encryption_public_key: arrayToBase58(this.dappKeyPair.publicKey),
        nonce: arrayToBase58(nonce),
        payload: arrayToBase58(encryptedPayload),
        redirect_link: encodedRedirectUrl
      }).toString()}`;
      
      console.log('Sending transaction to Backpack with URL:', url);
      
      // Check for iOS platform for special handling
      
      if (isIOS) {
        // On iOS, we use the universal link fallback mechanism that will return to Safari
        // iOS needs this special handling to return to Safari after the wallet operation
        window.location.href = `https://backpack.app/return?address_=_skip_&redirect_link=${encodeURIComponent(url)}`;
      } else {
        // On other platforms, we can open the URL directly
        window.location.href = url;
      }
      
      return url;
    } catch (error) {
      console.error('Error signing transaction with Backpack:', error);
      throw error;
    }
  }
  
  /**
   * Handles the response from a transaction request
   */
  public handleTransactionResponse(url: URL): string | null {
    try {
      // Extract response parameters - it could be either direct signature or encrypted data
      const signature = url.searchParams.get('signature');
      const data = url.searchParams.get('data');
      const nonce = url.searchParams.get('nonce');
      const wallet_encryption_public_key = url.searchParams.get('wallet_encryption_public_key');
      
      // If we have a direct signature, use it
      if (signature) {
        return signature;
      }
      
      // If we have encrypted data
      if (data && nonce && wallet_encryption_public_key) {
        try {
          // Decode parameters
          const walletPublicKeyBytes = base58ToArray(wallet_encryption_public_key);
          const nonceBytes = base58ToArray(nonce);
          const encryptedDataBytes = base58ToArray(data);
          
          // Create shared secret
          const sharedSecret = nacl.box.before(
            walletPublicKeyBytes,
            this.dappKeyPair.secretKey
          );
          
          // Decrypt the data
          const decrypted = this.decryptPayload(
            encryptedDataBytes,
            nonceBytes,
            sharedSecret
          );
          
          if (decrypted) {
            // Parse the decrypted JSON
            const decoder = new TextDecoder();
            const jsonStr = decoder.decode(decrypted);
            const parsedData = JSON.parse(jsonStr);
            
            // Check if signature is in the decrypted data
            if (parsedData && parsedData.signature) {
              return parsedData.signature;
            }
          }
        } catch (decryptError) {
          console.error('Error decrypting transaction response:', decryptError);
        }
      }
      
      console.error('Missing or invalid signature in Backpack transaction response');
      return null;
    } catch (error) {
      console.error('Error handling Backpack transaction response:', error);
      return null;
    }
  }
  
  /**
   * Helper function to decrypt payloads from Backpack
   */
  private decryptPayload(
    encryptedPayload: Uint8Array,
    nonce: Uint8Array,
    sharedSecret: Uint8Array
  ): Uint8Array | null {
    try {
      return nacl.box.open.after(encryptedPayload, nonce, sharedSecret);
    } catch (error) {
      console.error('Error decrypting payload:', error);
      return null;
    }
  }
  
  /**
   * Check if connected to Backpack
   */
  public isConnected(): boolean {
    return this.session !== null && this.walletPublicKey !== null;
  }
  
  /**
   * Get the connected wallet's public key
   */
  public getPublicKey(): PublicKey | null {
    return this.walletPublicKey;
  }
}

/**
 * Hook for using Backpack wallet functionality
 */
export function useBackpackWallet() {
  const backpack = BackpackWallet.getInstance();
  
  const connectWallet = (): void => {
    backpack.connect();
  };
  
  const disconnectWallet = (): void => {
    backpack.disconnect();
  };
  
  const signAndSendTransaction = (transaction: Transaction): void => {
    backpack.signAndSendTransaction(transaction);
  };
  
  const isConnected = (): boolean => {
    return backpack.isConnected();
  };
  
  const getPublicKey = (): PublicKey | null => {
    return backpack.getPublicKey();
  };
  
  return {
    connectWallet,
    disconnectWallet,
    signAndSendTransaction,
    isConnected,
    getPublicKey
  };
}

export default BackpackWallet;