import { useState, useEffect } from 'react';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { buildUrl } from './encryptPayload';
import { decryptPayload } from './decryptPayload';
import { encryptPayload } from './encryptPayload';

// Create redirect URLs
const DEVNET_CONNECTION = "https://api.devnet.solana.com";
let onConnectRedirectLink = '';
let onDisconnectRedirectLink = '';
let onSignAndSendTransactionRedirectLink = '';

// Create proper URLs with the application's origin
if (typeof window !== 'undefined') {
  const origin = window.location.origin;
  onConnectRedirectLink = `${origin}/onConnect`;
  onDisconnectRedirectLink = `${origin}/onDisconnect`;
  onSignAndSendTransactionRedirectLink = `${origin}/onSignAndSendTransaction`;
}

// Connection singleton
const connection = new Connection(DEVNET_CONNECTION, "confirmed");

// Phantom connection handler
export class PhantomDeepLink {
  private static instance: PhantomDeepLink;
  private dappKeyPair: nacl.BoxKeyPair;
  private sharedSecret?: Uint8Array;
  private session?: string;
  private phantomWalletPublicKey: PublicKey | null = null;
  
  private constructor() {
    this.dappKeyPair = nacl.box.keyPair();
  }
  
  public static getInstance(): PhantomDeepLink {
    if (!PhantomDeepLink.instance) {
      PhantomDeepLink.instance = new PhantomDeepLink();
    }
    return PhantomDeepLink.instance;
  }
  
  /**
   * Initiate a connection to Phantom
   */
  public connect(): string {
    try {
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
        cluster: "devnet",
        app_url: window.location.origin,
        redirect_link: onConnectRedirectLink,
      });
  
      const url = buildUrl("connect", params);
      return url;
    } catch (error) {
      console.error("Error initiating Phantom connection:", error);
      throw error;
    }
  }
  
  /**
   * Handle the URL parameters returned after connecting with Phantom
   */
  public handleConnectResponse(url: URL): string | null {
    try {
      const params = url.searchParams;
      
      // Handle error response
      if (params.get("errorCode")) {
        // Log only the error code and message
        console.error("Phantom connection error:", {
          errorCode: params.get("errorCode"),
          errorMessage: params.get("errorMessage")
        });
        return null;
      }
      
      // Process successful connection
      const sharedSecretDapp = nacl.box.before(
        bs58.decode(params.get("phantom_encryption_public_key")!),
        this.dappKeyPair.secretKey
      );
      
      const connectData = decryptPayload(
        params.get("data")!,
        params.get("nonce")!,
        sharedSecretDapp
      );
      
      this.sharedSecret = sharedSecretDapp;
      this.session = connectData.session;
      this.phantomWalletPublicKey = new PublicKey(connectData.public_key);
      
      console.log(`Connected to ${connectData.public_key.toString()}`);
      return connectData.public_key.toString();
    } catch (error) {
      console.error("Error processing connection response:", error);
      return null;
    }
  }
  
  /**
   * Disconnect from Phantom
   */
  public disconnect(): string {
    try {
      if (!this.sharedSecret || !this.session) {
        throw new Error("Not connected to Phantom");
      }
      
      const payload = { session: this.session };
      const [nonce, encryptedPayload] = encryptPayload(payload, this.sharedSecret);
      
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
        nonce: bs58.encode(nonce),
        redirect_link: onDisconnectRedirectLink,
        payload: bs58.encode(encryptedPayload),
      });
      
      const url = buildUrl("disconnect", params);
      return url;
    } catch (error) {
      console.error("Error disconnecting from Phantom:", error);
      throw error;
    }
  }
  
  /**
   * Handle disconnect response
   */
  public handleDisconnectResponse(): void {
    this.phantomWalletPublicKey = null;
    this.session = undefined;
    console.log("Disconnected from Phantom");
  }
  
  /**
   * Sign and send a transaction
   */
  public signAndSendTransaction(transaction: Transaction): string {
    try {
      if (!this.phantomWalletPublicKey || !this.sharedSecret || !this.session) {
        throw new Error("Not connected to Phantom");
      }
      
      transaction.feePayer = this.phantomWalletPublicKey;
      transaction.recentBlockhash = "simulated-blockhash"; // This will be replaced in real implementation
      
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
      });
      
      const payload = {
        session: this.session,
        transaction: bs58.encode(serializedTransaction),
      };
      
      const [nonce, encryptedPayload] = encryptPayload(payload, this.sharedSecret);
      
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(this.dappKeyPair.publicKey),
        nonce: bs58.encode(nonce),
        redirect_link: onSignAndSendTransactionRedirectLink,
        payload: bs58.encode(encryptedPayload),
      });
      
      const url = buildUrl("signAndSendTransaction", params);
      return url;
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw error;
    }
  }
  
  /**
   * Handle transaction response
   */
  public handleTransactionResponse(url: URL): string | null {
    try {
      const params = url.searchParams;
      
      // Handle error
      if (params.get("errorCode")) {
        // Log only the error code and message
        console.error("Transaction error:", {
          errorCode: params.get("errorCode"),
          errorMessage: params.get("errorMessage")
        });
        return null;
      }
      
      if (!this.sharedSecret) {
        throw new Error("Not connected to Phantom");
      }
      
      const txData = decryptPayload(
        params.get("data")!,
        params.get("nonce")!,
        this.sharedSecret
      );
      
      console.log("Transaction submitted:", txData);
      return txData.signature;
    } catch (error) {
      console.error("Error processing transaction response:", error);
      return null;
    }
  }
  
  /**
   * Get connected wallet public key
   */
  public getPublicKey(): PublicKey | null {
    return this.phantomWalletPublicKey;
  }
  
  /**
   * Check if connected to Phantom
   */
  public isConnected(): boolean {
    return !!this.phantomWalletPublicKey;
  }
}

// Create a hook for handling deep links
export function usePhantomDeepLink() {
  const [deepLink, setDeepLink] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const phantomDeepLink = PhantomDeepLink.getInstance();
  
  // Process URL for deep link responses
  useEffect(() => {
    if (!deepLink) return;
    
    try {
      const url = new URL(deepLink);
      
      // Handle connect response
      if (url.pathname.includes("onConnect")) {
        const publicKey = phantomDeepLink.handleConnectResponse(url);
        setWalletAddress(publicKey);
      }
      
      // Handle disconnect response
      if (url.pathname.includes("onDisconnect")) {
        phantomDeepLink.handleDisconnectResponse();
        setWalletAddress(null);
      }
      
      // Handle transaction response
      if (url.pathname.includes("onSignAndSendTransaction")) {
        const signature = phantomDeepLink.handleTransactionResponse(url);
        setTransactionSignature(signature);
      }
    } catch (error) {
      console.error("Error processing deep link:", error);
    }
  }, [deepLink]);
  
  // Connect to Phantom
  const connect = () => {
    try {
      const url = phantomDeepLink.connect();
      window.location.href = url;
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
    }
  };
  
  // Disconnect from Phantom
  const disconnect = () => {
    try {
      const url = phantomDeepLink.disconnect();
      window.location.href = url;
    } catch (error) {
      console.error("Error disconnecting from Phantom:", error);
    }
  };
  
  // Sign and send transaction
  const signAndSendTransaction = (transaction: Transaction) => {
    try {
      const url = phantomDeepLink.signAndSendTransaction(transaction);
      window.location.href = url;
    } catch (error) {
      console.error("Error signing transaction:", error);
    }
  };
  
  return {
    walletAddress,
    transactionSignature,
    connect,
    disconnect,
    signAndSendTransaction,
    setDeepLink,
    isConnected: phantomDeepLink.isConnected(),
  };
}