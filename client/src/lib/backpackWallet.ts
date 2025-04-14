/**
 * Backpack Wallet integration utility
 * Provides methods for connecting to Backpack wallet, signing transactions, and managing sessions
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import './buffer-polyfill'; // Ensure Buffer is available

// Simple encoding/decoding utilities to replace bs58
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, array as any));
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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
    
    // Get baseUrl with correct port
    const baseUrl = window.location.origin.replace(/:3000\b/, ':5000');
    
    // Create connection URL parameters
    const params = new URLSearchParams({
      dapp_encryption_public_key: arrayToBase64(this.dappKeyPair.publicKey),
      cluster: 'devnet',
      redirect_link: baseUrl + '/?backpack=connect',
    });
    
    // Form the URL
    const url = `https://backpack.app/connect?${params.toString()}`;
    
    // Open the URL
    window.location.href = url;
    
    return url;
  }
  
  /**
   * Handles the response from Backpack after a connection attempt
   */
  public handleConnectResponse(url: URL): string | null {
    try {
      // Extract response parameters
      const encrypted_key = url.searchParams.get('encrypted_key');
      this.session = url.searchParams.get('session');
      const wallet_public_key = url.searchParams.get('wallet_public_key');
      const nonce = url.searchParams.get('nonce');
      
      // Validate required parameters
      if (!encrypted_key || !this.session || !wallet_public_key || !nonce) {
        console.error('Missing required parameters in Backpack connect response');
        return null;
      }
      
      // Decode parameters
      const walletPublicKeyBytes = base64ToArray(wallet_public_key);
      const nonceBytes = base64ToArray(nonce);
      const encryptedKeyBytes = base64ToArray(encrypted_key);
      
      // Create shared secret
      const walletEncryptionPublicKey = walletPublicKeyBytes.slice(0, 32);
      const sharedSecret = nacl.box.before(
        walletEncryptionPublicKey,
        this.dappKeyPair.secretKey
      );
      
      // Decrypt the secret key
      const decrypted = this.decryptPayload(
        encryptedKeyBytes,
        nonceBytes,
        sharedSecret
      );
      
      if (!decrypted) {
        console.error('Failed to decrypt Backpack connect response');
        return null;
      }
      
      // Set the wallet public key
      this.walletPublicKey = new PublicKey(wallet_public_key);
      
      // Return the wallet public key string
      return wallet_public_key;
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
    
    // Redirect to disconnect URL
    const baseUrl = window.location.origin.replace(/:3000\b/, ':5000');
    const redirectLink = baseUrl + '/?backpack=disconnect';
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
      
      // Create connection URL parameters
      const params = new URLSearchParams({
        session: this.session,
        transaction: arrayToBase64(serializedTransaction),
        redirect_link: baseUrl + '/?backpack=transaction',
      });
      
      // Form the URL
      const url = `https://backpack.app/sign_transaction?${params.toString()}`;
      
      // Open the URL
      window.location.href = url;
      
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
      // Extract the signature
      const signature = url.searchParams.get('signature');
      
      if (!signature) {
        console.error('Missing signature in Backpack transaction response');
        return null;
      }
      
      return signature;
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