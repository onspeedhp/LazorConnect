import { useState, useCallback } from 'react';
import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

// Connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com');

// Type for wallet connection state
interface WalletState {
  dappKeyPair: nacl.BoxKeyPair | null;
  sharedSecret: Uint8Array | null;
  session: string;
  publicKey: string;
}

/**
 * Custom hook for Phantom wallet connection state and functions
 */
export function usePhantomWallet() {
  // Connection state stored in React useState
  const [walletState, setWalletState] = useState<WalletState>({
    dappKeyPair: null,
    sharedSecret: null,
    session: '',
    publicKey: '',
  });

  // Generate encryption keypair for secure communication with Phantom
  const getOrCreateDappKeyPair = useCallback((): nacl.BoxKeyPair => {
    if (!walletState.dappKeyPair) {
      const newKeyPair = nacl.box.keyPair();
      setWalletState((prev) => ({ ...prev, dappKeyPair: newKeyPair }));
      return newKeyPair;
    }
    return walletState.dappKeyPair;
  }, [walletState.dappKeyPair]);

  // Encrypt payload for sending to Phantom
  const encryptPayload = useCallback((payload: any): [Uint8Array, Uint8Array] => {
    if (!walletState.sharedSecret) throw new Error("Missing shared secret");

    const nonce = nacl.randomBytes(24);
    const encryptedPayload = nacl.box.after(
      Buffer.from(JSON.stringify(payload)),
      nonce,
      walletState.sharedSecret
    );

    return [nonce, encryptedPayload];
  }, [walletState.sharedSecret]);

  // Decrypt payload received from Phantom
  const decryptPayload = useCallback((data: string, nonce: string): any => {
    if (!walletState.sharedSecret) throw new Error("Missing shared secret");

    const decryptedData = nacl.box.open.after(
      bs58.decode(data),
      bs58.decode(nonce),
      walletState.sharedSecret
    );
    
    if (!decryptedData) {
      throw new Error("Unable to decrypt data");
    }
    
    return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
  }, [walletState.sharedSecret]);

  /**
   * Process connection response from Phantom wallet
   * This implementation focuses on handling the callback URL and extracting
   * the user's wallet public key for display and interaction
   */
  const processConnectionResponse = useCallback((url: string): { publicKey: string; session: string } | null => {
    try {
      console.log("Processing Phantom wallet connection callback URL:", url);
      
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // Debug: Log all URL parameters to see what we received
      console.log("Callback URL parameters:");
      params.forEach((value, key) => {
        console.log(`  ${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
      });

      // Check for errors first
      if (params.get("errorCode")) {
        console.error("Phantom connection error:", params.get("errorMessage"));
        return null;
      }

      // Try multiple approaches to find the wallet public key
      
      // 1. Look for direct public key parameters (simplest case)
      const directPublicKeys = [
        params.get("phantom_address"),
        params.get("public_key"),
        params.get("address"),
        params.get("wallet"),
        params.get("account")
      ].filter(Boolean);
      
      if (directPublicKeys.length > 0) {
        const directPublicKey = directPublicKeys[0] as string;
        console.log("Found direct public key in URL:", directPublicKey);
        
        // Update state with the found public key
        setWalletState(prev => ({
          ...prev,
          publicKey: directPublicKey,
          session: "direct-connection"
        }));
        
        return {
          publicKey: directPublicKey,
          session: "direct-connection"
        };
      }
      
      // 2. Look for Solana-specific address formats
      const allParamValues: string[] = [];
      params.forEach((value) => allParamValues.push(value));
      
      // Try to find any parameter that looks like a Solana public key
      // Solana addresses are base58 encoded and typically 32-44 characters
      const possibleAddresses = allParamValues.filter(value => {
        // Check if it looks like a Solana address (base58, right length)
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
      });
      
      if (possibleAddresses.length > 0) {
        const solanaAddress = possibleAddresses[0];
        console.log("Found possible Solana address in parameters:", solanaAddress);
        
        // Update state with the found public key
        setWalletState(prev => ({
          ...prev,
          publicKey: solanaAddress,
          session: "inferred-connection"
        }));
        
        return {
          publicKey: solanaAddress,
          session: "inferred-connection"
        };
      }

      // 3. Try the standard encrypted flow
      const phantomEncryptionPublicKey = params.get("phantom_encryption_public_key");
      const data = params.get("data");
      const nonce = params.get("nonce");
      
      if (phantomEncryptionPublicKey && data && nonce && walletState.dappKeyPair) {
        console.log("Attempting encrypted connection method");
        
        try {
          // Create shared secret
          const sharedSecretDapp = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            walletState.dappKeyPair.secretKey
          );
          
          // Update the shared secret in state first
          setWalletState(prev => ({
            ...prev,
            sharedSecret: sharedSecretDapp
          }));
          
          // Then attempt to decrypt with the updated state
          // Note: This may not work in the same render cycle, might need to handle differently
          try {
            // For now, directly use the sharedSecretDapp without relying on state update
            const connectData = decryptWithSecret(data, nonce, sharedSecretDapp);
            
            // Save connection state
            setWalletState(prev => ({
              ...prev,
              sharedSecret: sharedSecretDapp,
              session: connectData.session,
              publicKey: connectData.public_key
            }));
            
            console.log("Successfully decrypted connection data:", connectData.public_key);
            
            return {
              publicKey: connectData.public_key,
              session: connectData.session
            };
          } catch (decryptError) {
            console.error("Error decrypting connection payload:", decryptError);
          }
        } catch (encryptError) {
          console.error("Error establishing shared secret:", encryptError);
        }
      } else {
        console.log("Missing encryption parameters, cannot use encrypted connection flow");
      }
      
      // If we reach here, we couldn't find the public key
      console.error("Could not find wallet public key in the callback URL");
      return null;
    } catch (error) {
      console.error("Error processing connection response:", error);
      return null;
    }
  }, [walletState.dappKeyPair, decryptPayload]);

  // Helper function for one-time decryption without relying on state updates
  const decryptWithSecret = (data: string, nonce: string, secret: Uint8Array): any => {
    const decryptedData = nacl.box.open.after(
      bs58.decode(data),
      bs58.decode(nonce),
      secret
    );
    
    if (!decryptedData) {
      throw new Error("Unable to decrypt data");
    }
    
    return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
  };

  // Connect to Phantom wallet
  const connectPhantom = useCallback((): string => {
    try {
      // Create encryption keypair if it doesn't exist
      const keyPair = getOrCreateDappKeyPair();
      
      // Create a connection ID to help correlate the request and response
      const connectionId = Math.random().toString(36).substring(2, 15);
      
      // Generate a redirect URL with additional parameters for better tracking
      const redirectUrl = new URL(`${window.location.origin}${window.location.pathname}`);
      redirectUrl.searchParams.append("action", "phantom_connect");
      redirectUrl.searchParams.append("connection_id", connectionId);
      redirectUrl.searchParams.append("timestamp", Date.now().toString());
      
      // Prepare connection parameters
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(keyPair.publicKey),
        cluster: "devnet",
        app_url: window.location.origin,
        redirect_link: redirectUrl.toString()
      });
      
      // Add some additional parameters to make troubleshooting easier
      params.append("app_name", "Lazor vs Phantom Demo");
      params.append("return_url", window.location.origin);
      
      // Figure out which URL format to use based on the environment
      let url;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile devices - use deep link
        url = `phantom://v1/connect?${params.toString()}`;
      } else {
        // Desktop or other devices - use universal link format which may work better
        url = `https://phantom.app/ul/v1/connect?${params.toString()}`;
      }
      
      // Log the URL for debugging
      console.log("Redirecting to Phantom:", url);
      
      // Store connection ID in localStorage for verification
      try {
        localStorage.setItem("phantom_connection_id", connectionId);
        localStorage.setItem("phantom_connection_timestamp", Date.now().toString());
      } catch (storageError) {
        console.warn("Could not store connection data in localStorage:", storageError);
      }
      
      // Redirect to Phantom
      window.location.href = url;
      
      return "";
    } catch (error) {
      console.error("Error connecting to Phantom:", error);
      return "";
    }
  }, [getOrCreateDappKeyPair]);

  // Check if we have a wallet response in the URL
  const checkForWalletResponse = useCallback((): boolean => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('action') && urlParams.get('action') === 'phantom_connect';
    }
    return false;
  }, []);

  // Disconnect from Phantom wallet
  const disconnectPhantom = useCallback((): void => {
    try {
      // For a proper encrypted session
      if (walletState.session && walletState.sharedSecret && walletState.dappKeyPair) {
        // Create payload for disconnect
        const payload = { session: walletState.session };
        
        try {
          const [nonce, encryptedPayload] = encryptPayload(payload);

          // Prepare disconnect parameters for encrypted session
          const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(walletState.dappKeyPair.publicKey),
            nonce: bs58.encode(nonce),
            redirect_link: `${window.location.origin}${window.location.pathname}?action=phantom_disconnect`,
            payload: bs58.encode(encryptedPayload)
          });

          // Figure out which URL format to use based on the environment
          let url;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          if (isMobile) {
            // Mobile devices - use deep link
            url = `phantom://v1/disconnect?${params.toString()}`;
          } else {
            // Desktop or other devices - use universal link
            url = `https://phantom.app/ul/v1/disconnect?${params.toString()}`;
          }
          
          // Log the URL for debugging
          console.log("Disconnecting from Phantom:", url);
          
          // In a real app, we would redirect to Phantom here
          // but for our demo we'll just clear the connection state
          // window.location.href = url;
        } catch (encryptError) {
          console.error("Error encrypting disconnect payload:", encryptError);
        }
      } else if (walletState.publicKey) {
        // For direct connection (no encryption)
        console.log("Disconnecting direct connection for", walletState.publicKey);
      } else {
        console.log("Not connected to Phantom");
      }
      
      // Always clear connection state
      setWalletState({
        dappKeyPair: null,
        sharedSecret: null,
        session: '',
        publicKey: ''
      });
    } catch (error) {
      console.error("Error disconnecting from Phantom:", error);
      
      // Still clear connection state even if there was an error
      setWalletState({
        dappKeyPair: null,
        sharedSecret: null,
        session: '',
        publicKey: ''
      });
    }
  }, [walletState, encryptPayload]);

  // Get wallet balance
  const getWalletBalance = useCallback(async (publicKey: string): Promise<number> => {
    try {
      const pk = new PublicKey(publicKey);
      const balance = await connection.getBalance(pk);
      return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return 0;
    }
  }, []);

  // Request an airdrop
  const requestAirdrop = useCallback(async (publicKey: string, amount: number = 1): Promise<string | null> => {
    try {
      const pk = new PublicKey(publicKey);
      const signature = await connection.requestAirdrop(
        pk,
        amount * LAMPORTS_PER_SOL // Convert SOL to lamports
      );
      
      await connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error("Error requesting airdrop:", error);
      return null;
    }
  }, []);

  // Send a transaction
  const sendTransaction = useCallback((senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
    if (!walletState.session && walletState.publicKey === "") {
      console.error("Not connected to Phantom");
      return;
    }

    try {
      // For a real transaction, we would:
      // 1. Create and serialize a Solana transaction
      // 2. Encrypt the payload
      // 3. Prepare the deeplink params
      
      // For this demo, we'll use a simplified approach
      const redirectUrl = `${window.location.origin}${window.location.pathname}?action=phantom_transaction`;
      
      // Simplified parameters that would typically include the encrypted transaction
      const params = new URLSearchParams({
        redirect_link: redirectUrl
      });
      
      // Add encryption key if available
      if (walletState.dappKeyPair) {
        params.append("dapp_encryption_public_key", bs58.encode(walletState.dappKeyPair.publicKey));
      }
      
      // Add transaction details for demo (in a real app, this would be part of the encrypted payload)
      params.append("sender", senderPublicKey);
      params.append("receiver", recipientPublicKey);
      params.append("amount", amount.toString());
      
      // Figure out which URL format to use based on the environment
      let url;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile devices - use deep link
        url = `phantom://v1/signTransaction?${params.toString()}`;
      } else {
        // Desktop or other devices - use universal link
        url = `https://phantom.app/ul/v1/signTransaction?${params.toString()}`;
      }
      
      // Log transaction details
      console.log(`Sending ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
      console.log("Redirecting to Phantom:", url);
      
      // Redirect to Phantom
      window.location.href = url;
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  }, [walletState]);

  // Return all wallet methods and state
  return {
    walletState,
    connectPhantom,
    processConnectionResponse,
    checkForWalletResponse,
    disconnectPhantom,
    getWalletBalance,
    requestAirdrop,
    sendTransaction
  };
}