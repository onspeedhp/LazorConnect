import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

// Connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com');

// In-memory storage for connection state
let dappKeyPair: nacl.BoxKeyPair | null = null;
let sharedSecret: Uint8Array | null = null;
let session: string | null = null;
let phantomWalletPublicKey: string | null = null;

// Generate encryption keypair for secure communication with Phantom
const getOrCreateDappKeyPair = (): nacl.BoxKeyPair => {
  if (!dappKeyPair) {
    dappKeyPair = nacl.box.keyPair();
  }
  return dappKeyPair;
};

// Encrypt payload for sending to Phantom
const encryptPayload = (payload: any): [Uint8Array, Uint8Array] => {
  if (!sharedSecret) throw new Error("Missing shared secret");

  const nonce = nacl.randomBytes(24);
  const encryptedPayload = nacl.box.after(
    Buffer.from(JSON.stringify(payload)),
    nonce,
    sharedSecret
  );

  return [nonce, encryptedPayload];
};

// Decrypt payload received from Phantom
const decryptPayload = (data: string, nonce: string): any => {
  if (!sharedSecret) throw new Error("Missing shared secret");

  const decryptedData = nacl.box.open.after(
    bs58.decode(data),
    bs58.decode(nonce),
    sharedSecret
  );
  
  if (!decryptedData) {
    throw new Error("Unable to decrypt data");
  }
  
  return JSON.parse(Buffer.from(decryptedData).toString("utf8"));
};

// Process connection response from Phantom
export const processConnectionResponse = (url: string): { publicKey: string; session: string } | null => {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    // Check for errors
    if (params.get("errorCode")) {
      console.error("Phantom connection error:", params.get("errorMessage"));
      return null;
    }

    // Check for direct public key in URL (some wallet implementations do this)
    const directPublicKey = params.get("phantom_address") || params.get("public_key");
    if (directPublicKey) {
      console.log("Found direct public key in URL:", directPublicKey);
      phantomWalletPublicKey = directPublicKey;
      session = "direct-connection"; // Simplified session handling
      
      return {
        publicKey: directPublicKey,
        session: "direct-connection"
      };
    }

    // Try encrypted data flow
    const phantomEncryptionPublicKey = params.get("phantom_encryption_public_key");
    const data = params.get("data");
    const nonce = params.get("nonce");
    
    if (!phantomEncryptionPublicKey || !data || !nonce || !dappKeyPair) {
      console.log("Missing encryption parameters for secure connection");
      
      // If we reach here, it means we don't have either direct connection or proper encrypted connection
      // Let's check if the URL has any information that might help us identify a wallet connection
      
      // In real world this would be more robust, but for demo:
      if (params.has("phantom_wallet") || params.has("phantom")) {
        // Extract any potential wallet information
        const accountInfo = params.get("account") || params.get("phantom_wallet") || params.get("wallet_address");
        if (accountInfo) {
          console.log("Found potential wallet info:", accountInfo);
          return {
            publicKey: accountInfo,
            session: "inferred-connection"
          };
        }
      }
      
      return null;
    }

    // Create shared secret for encrypted connection
    const sharedSecretDapp = nacl.box.before(
      bs58.decode(phantomEncryptionPublicKey),
      dappKeyPair.secretKey
    );

    try {
      // Decrypt connection data
      const connectData = decryptPayload(data, nonce);

      // Save connection state
      sharedSecret = sharedSecretDapp;
      session = connectData.session;
      phantomWalletPublicKey = connectData.public_key;
      
      console.log("Successfully decrypted wallet connection:", connectData.public_key);
      
      return {
        publicKey: connectData.public_key,
        session: connectData.session
      };
    } catch (decryptError) {
      console.error("Error decrypting payload:", decryptError);
      return null;
    }
  } catch (error) {
    console.error("Error processing connection response:", error);
    return null;
  }
};

// Connect to Phantom wallet
export const connectPhantom = (): string => {
  try {
    // Create encryption keypair if it doesn't exist
    const keyPair = getOrCreateDappKeyPair();
    
    // Prepare connection parameters
    const params = new URLSearchParams({
      dapp_encryption_public_key: bs58.encode(keyPair.publicKey),
      cluster: "devnet",
      app_url: window.location.origin,
      redirect_link: `${window.location.origin}${window.location.pathname}?action=phantom_connect`
    });

    // Figure out which URL format to use based on the environment
    // On mobile, we want to use deep links, on desktop we might use universal links
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
    
    // Redirect to Phantom
    window.location.href = url;
    
    return "";
  } catch (error) {
    console.error("Error connecting to Phantom:", error);
    return "";
  }
};

// Check if we have a wallet response in the URL
export const checkForWalletResponse = (): boolean => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('action') && urlParams.get('action') === 'phantom_connect';
  }
  return false;
};

// Disconnect from Phantom wallet
export const disconnectPhantom = (): void => {
  try {
    // For a proper encrypted session
    if (session && sharedSecret && dappKeyPair) {
      // Create payload for disconnect
      const payload = { session };
      
      try {
        const [nonce, encryptedPayload] = encryptPayload(payload);

        // Prepare disconnect parameters for encrypted session
        const params = new URLSearchParams({
          dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
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
    } else if (phantomWalletPublicKey) {
      // For direct connection (no encryption)
      console.log("Disconnecting direct connection for", phantomWalletPublicKey);
    } else {
      console.log("Not connected to Phantom");
    }
    
    // Always clear connection state
    dappKeyPair = null;
    sharedSecret = null;
    session = null;
    phantomWalletPublicKey = null;
  } catch (error) {
    console.error("Error disconnecting from Phantom:", error);
    
    // Still clear connection state even if there was an error
    dappKeyPair = null;
    sharedSecret = null;
    session = null;
    phantomWalletPublicKey = null;
  }
};

// Get wallet balance
export const getWalletBalance = async (publicKey: string): Promise<number> => {
  try {
    const pk = new PublicKey(publicKey);
    const balance = await connection.getBalance(pk);
    return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    return 0;
  }
};

// Request an airdrop
export const requestAirdrop = async (publicKey: string, amount: number = 1): Promise<string | null> => {
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
};

// Send a transaction
export const sendTransaction = (senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
  if (!session && phantomWalletPublicKey === null) {
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
    if (dappKeyPair) {
      params.append("dapp_encryption_public_key", bs58.encode(dappKeyPair.publicKey));
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
};