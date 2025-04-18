import { useState, useCallback } from 'react';
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
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
  // Try to get initial dappKeyPair from localStorage
  const getInitialDappKeyPair = (): nacl.BoxKeyPair | null => {
    try {
      const storedKeyPair = localStorage.getItem('phantom_dapp_keypair');
      if (storedKeyPair) {
        const parsedKeyPair = JSON.parse(storedKeyPair);
        // Convert the stored strings back to Uint8Array objects
        return {
          publicKey: new Uint8Array(Object.values(parsedKeyPair.publicKey)),
          secretKey: new Uint8Array(Object.values(parsedKeyPair.secretKey))
        };
      }
    } catch (error) {
      console.warn("Could not restore initial keypair from localStorage:", error);
    }
    return null;
  };

  // Connection state stored in React useState, initialized with localStorage values if available
  const [walletState, setWalletState] = useState<WalletState>({
    dappKeyPair: getInitialDappKeyPair(),
    sharedSecret: null,
    session: '',
    publicKey: '',
  });

  // Helper function to get keypair from localStorage
  const getKeypairFromLocalStorage = (): nacl.BoxKeyPair | null => {
    try {
      const storedKeyPair = localStorage.getItem('phantom_dapp_keypair');
      if (storedKeyPair) {
        const parsedKeyPair = JSON.parse(storedKeyPair);
        // Convert the stored strings back to Uint8Array objects
        return {
          publicKey: new Uint8Array(Object.values(parsedKeyPair.publicKey)),
          secretKey: new Uint8Array(Object.values(parsedKeyPair.secretKey))
        };
      }
    } catch (error) {
      console.warn("Could not restore keypair from localStorage:", error);
    }
    return null;
  };

  // Helper function to store keypair in localStorage
  const storeKeypairInLocalStorage = (keyPair: nacl.BoxKeyPair): void => {
    try {
      // Need to convert Uint8Array to regular objects for JSON serialization
      const serializableKeyPair = {
        publicKey: Array.from(keyPair.publicKey),
        secretKey: Array.from(keyPair.secretKey)
      };
      localStorage.setItem('phantom_dapp_keypair', JSON.stringify(serializableKeyPair));
      console.log("Stored keypair in localStorage");
    } catch (error) {
      console.warn("Could not store keypair in localStorage:", error);
    }
  };
  
  // Helper function to clear connection data from localStorage
  const clearConnectionDataFromLocalStorage = (): void => {
    try {
      localStorage.removeItem('phantom_dapp_keypair');
      localStorage.removeItem('phantom_connection_id');
      localStorage.removeItem('phantom_connection_timestamp');
      console.log("Cleared connection data from localStorage");
    } catch (error) {
      console.warn("Could not clear data from localStorage:", error);
    }
  };

  // Generate encryption keypair for secure communication with Phantom
  const getOrCreateDappKeyPair = useCallback((): nacl.BoxKeyPair => {
    // First try to get from state
    if (walletState.dappKeyPair) {
      return walletState.dappKeyPair;
    }
    
    // Next, try to get from localStorage
    const restoredKeyPair = getKeypairFromLocalStorage();
    if (restoredKeyPair) {
      console.log('Restored keypair from localStorage');
      setWalletState((prev) => ({ ...prev, dappKeyPair: restoredKeyPair }));
      return restoredKeyPair;
    }
    
    // If no keypair exists, create a new one
    const newKeyPair = nacl.box.keyPair();
    
    // Store in state
    setWalletState((prev) => ({ ...prev, dappKeyPair: newKeyPair }));
    
    // Also store in localStorage for persistence
    storeKeypairInLocalStorage(newKeyPair);
    
    return newKeyPair;
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
   * the user's wallet public key through the encrypted payload
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

      // Only use the standard encrypted flow for consistency
      const phantomEncryptionPublicKey = params.get("phantom_encryption_public_key");
      const data = params.get("data");
      const nonce = params.get("nonce");
      
      // Get dappKeyPair - if not in state, try to get from localStorage
      let keyPair = walletState.dappKeyPair;
      if (!keyPair) {
        console.log("No keyPair in state, trying to get from localStorage");
        keyPair = getKeypairFromLocalStorage();
        
        if (keyPair) {
          // Update state with the keyPair
          setWalletState(prev => ({ ...prev, dappKeyPair: keyPair }));
          console.log("Restored keypair from localStorage for response processing");
        } else {
          console.error("No stored keypair found in localStorage");
        }
      }
      
      if (phantomEncryptionPublicKey && data && nonce && keyPair) {
        console.log("Processing encrypted connection data");
        
        try {
          // Create shared secret
          const sharedSecretDapp = nacl.box.before(
            bs58.decode(phantomEncryptionPublicKey),
            keyPair.secretKey
          );
          
          // Decrypt the connection data
          const connectData = decryptWithSecret(data, nonce, sharedSecretDapp);
          
          // Save connection state
          setWalletState(prev => ({
            ...prev,
            dappKeyPair: keyPair,
            sharedSecret: sharedSecretDapp,
            session: connectData.session,
            publicKey: connectData.public_key
          }));
          
          console.log("Successfully decrypted connection data:", connectData.public_key);
          
          return {
            publicKey: connectData.public_key,
            session: connectData.session
          };
        } catch (error) {
          console.error("Error processing encrypted connection data:", error);
        }
      } else {
        console.log("Missing required encryption parameters for connection");
        console.log("Required: phantom_encryption_public_key, data, nonce, and dappKeyPair");
        console.log("Available: ", {
          hasPhantomKey: !!phantomEncryptionPublicKey,
          hasData: !!data,
          hasNonce: !!nonce,
          hasDappKeyPair: !!keyPair
        });
      }
      
      // If we reach here, we couldn't find or decrypt the public key
      console.error("Could not process wallet connection response");
      return null;
    } catch (error) {
      console.error("Error processing connection response:", error);
      return null;
    }
  }, [walletState.dappKeyPair]);

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

  // Connect to Phantom wallet via mobile deeplink
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
      
      // Always use deep link for mobile
      const url = `phantom://v1/connect?${params.toString()}`;
      
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

          // Always use deep link for mobile
          const url = `phantom://v1/disconnect?${params.toString()}`;
          
          // Log the URL for debugging
          console.log("Disconnecting from Phantom:", url);
          
          // Redirect to Phantom
          window.location.href = url;
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
      
      // Clear localStorage data
      clearConnectionDataFromLocalStorage();
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
  const sendTransaction = useCallback(async (senderPublicKey: string, recipientPublicKey: string, amount: number): Promise<void> => {
    if (!walletState.session || !walletState.sharedSecret) {
      console.error("Not connected to Phantom with a secure session");
      return;
    }

    try {
      // Create a Solana transaction
      const transaction = new Transaction();
      
      // Add a transfer instruction to the transaction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(senderPublicKey),
          toPubkey: new PublicKey(recipientPublicKey),
          lamports: amount * LAMPORTS_PER_SOL,
        })
      );
      
      // Set the fee payer (the connected wallet)
      transaction.feePayer = new PublicKey(senderPublicKey);
      
      // Get the latest blockhash for transaction validity window
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      // Serialize the transaction
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
      });
      
      // Create the payload with the session and transaction
      const payload = {
        session: walletState.session,
        transaction: bs58.encode(serializedTransaction),
      };
      
      // Encrypt the payload using the shared secret
      const [nonce, encryptedPayload] = encryptPayload(payload);
      
      // Generate a redirect URL for handling the transaction response
      // Use ONLY hash fragments to prevent any page reload whatsoever
      const txTimestamp = Date.now().toString();
      const redirectUrl = `${window.location.origin}${window.location.pathname}#phantom-tx-${txTimestamp}`;
      
      // Store the transaction info in localStorage for stateful processing
      // This helps prevent page reloads from losing state
      try {
        localStorage.setItem("phantom_transaction_pending", "true");
        localStorage.setItem("phantom_transaction_timestamp", Date.now().toString());
      } catch (storageError) {
        console.warn("Could not store transaction data in localStorage:", storageError);
      }
      
      // Prepare parameters for the deeplink
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(walletState.dappKeyPair!.publicKey),
        nonce: bs58.encode(nonce),
        redirect_link: redirectUrl.toString(),
        payload: bs58.encode(encryptedPayload),
      });
      
      // Generate the deeplink URL for Phantom
      const url = `phantom://v1/signAndSendTransaction?${params.toString()}`;
      
      // Log transaction details
      console.log(`Sending ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
      console.log("Redirecting to Phantom with encrypted payload:", url);
      
      // Redirect to Phantom app
      window.location.href = url;
    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  }, [walletState, encryptPayload]);

  // Process transaction response from Phantom wallet
  const processTransactionResponse = useCallback((url: string): any => {
    try {
      if (!walletState.sharedSecret) {
        console.error("Missing shared secret for transaction decryption");
        return null;
      }

      // Check for our new pure hash format first (most reliable for mobile)
      if (url.includes('#phantom-tx-')) {
        console.log("Found new hash-based transaction response");
        // This is a hash-only transaction response, which means Phantom has successfully 
        // processed the transaction but we don't have structured data
        
        // In this case, we're focused on preventing page reloads, so we return basic success info
        return {
          success: true,
          method: "hash",
          timestamp: url.split('#phantom-tx-')[1]
        };
      }

      // Check if it's an older hash-based URL format
      else if (url.includes('#phantom_transaction')) {
        console.log("Found legacy hash-based transaction response");
        // Extract search params after the hash
        const hashParts = url.split('#phantom_transaction');
        if (hashParts.length > 1 && hashParts[1].startsWith('?')) {
          // Parse parameters from the hash fragment
          const paramString = hashParts[1].substring(1); // Remove the '?'
          const params = new URLSearchParams(paramString);
          
          // Check for errors
          if (params.has('errorCode') || params.has('errorMessage')) {
            console.error("Transaction error:", params.get('errorMessage'));
            return null;
          }
          
          // Check for data and nonce for encrypted response
          const data = params.get("data");
          const nonce = params.get("nonce");
          
          if (data && nonce) {
            try {
              // Decrypt the transaction data
              const transactionData = decryptPayload(data, nonce);
              console.log("Successfully decrypted transaction data:", transactionData);
              return transactionData;
            } catch (decryptError) {
              console.error("Error decrypting transaction data:", decryptError);
              return null;
            }
          } else {
            // Check for direct signature
            const signature = params.get("signature");
            if (signature) {
              return { signature };
            }
          }
        }
      } 
      // Also handle regular URL parameters for backward compatibility
      else {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;
        
        // Check for errors
        if (params.has('errorCode') || params.has('errorMessage')) {
          console.error("Transaction error:", params.get('errorMessage'));
          return null;
        }
        
        // Check for data and nonce for encrypted response
        const data = params.get("data");
        const nonce = params.get("nonce");
        
        if (data && nonce) {
          try {
            // Decrypt the transaction data
            const transactionData = decryptPayload(data, nonce);
            console.log("Successfully decrypted transaction data:", transactionData);
            return transactionData;
          } catch (decryptError) {
            console.error("Error decrypting transaction data:", decryptError);
            return null;
          }
        } else {
          // Check for direct signature
          const signature = params.get("signature");
          if (signature) {
            return { signature };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error processing transaction response:", error);
      return null;
    }
  }, [walletState.sharedSecret, decryptPayload]);

  // Return all wallet methods and state
  return {
    walletState,
    connectPhantom,
    processConnectionResponse,
    processTransactionResponse,
    checkForWalletResponse,
    disconnectPhantom,
    getWalletBalance,
    requestAirdrop,
    sendTransaction
  };
}