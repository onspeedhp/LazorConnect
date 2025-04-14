import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from 'buffer';

// Connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com');

// Get wallet connection via deeplink
export const connectWithBackpack = async (): Promise<string | undefined> => {
  try {
    // Generating deeplink parameters
    const redirectUrl = new URL(`${window.location.origin}${window.location.pathname}`);
    redirectUrl.searchParams.append("action", "backpack_connect");
    redirectUrl.searchParams.append("connection_id", Math.random().toString(36).substring(2, 15));
    redirectUrl.searchParams.append("timestamp", Date.now().toString());
    
    // Create deeplink URL
    const appDeepLink = `https://backpack.app/connect?${new URLSearchParams({
      app_name: "Lazor vs Backpack Demo",
      app_url: window.location.origin,
      cluster: "devnet",
      redirect_link: redirectUrl.toString()
    }).toString()}`;
    
    console.log("Redirecting to Backpack:", appDeepLink);
    
    // Redirect to the deeplink
    window.location.href = appDeepLink;
    
    return "";
  } catch (error) {
    console.error("Error connecting to Backpack:", error);
    return undefined;
  }
};

// Disconnect from Backpack wallet
export const disconnectBackpack = async (): Promise<void> => {
  try {
    const redirectUrl = `${window.location.origin}${window.location.pathname}?action=backpack_disconnect`;
    
    // Create deeplink URL
    const disconnectUrl = `https://backpack.app/disconnect?${new URLSearchParams({
      redirect_link: redirectUrl
    }).toString()}`;
    
    console.log("Disconnecting from Backpack:", disconnectUrl);
    
    // Redirect to the deeplink
    window.location.href = disconnectUrl;
  } catch (error) {
    console.error("Error disconnecting from Backpack:", error);
  }
};

// Process connection response from Backpack
export const processBackpackResponse = (url: string): string | null => {
  try {
    console.log("Processing Backpack wallet connection callback URL:", url);
    
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Debug: Log all URL parameters to see what we received
    console.log("Callback URL parameters:");
    params.forEach((value, key) => {
      console.log(`  ${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    });
    
    // Check for errors first
    if (params.get("errorCode")) {
      console.error("Backpack connection error:", params.get("errorMessage"));
      return null;
    }
    
    // Get the wallet public key
    const publicKey = params.get("public_key");
    if (publicKey) {
      console.log("Successfully connected to Backpack wallet:", publicKey);
      return publicKey;
    }
    
    // If we reach here, we couldn't find the public key
    console.error("Could not process Backpack wallet connection response");
    return null;
  } catch (error) {
    console.error("Error processing Backpack connection response:", error);
    return null;
  }
};

// Check for Backpack response in URL
export const checkForBackpackResponse = (): boolean => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('action') && urlParams.get('action') === 'backpack_connect';
  }
  return false;
};

// Get wallet balance
export const getBackpackWalletBalance = async (publicKey: string): Promise<number> => {
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
export const requestBackpackAirdrop = async (publicKey: string, amount: number = 1): Promise<string | null> => {
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

// Send a transaction via Backpack
export const sendBackpackTransaction = (senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
  try {
    // Construct redirect URL
    const redirectUrl = `${window.location.origin}${window.location.pathname}?action=backpack_transaction`;
    
    // Construct transaction parameters
    const params = new URLSearchParams({
      redirect_link: redirectUrl,
      sender: senderPublicKey,
      receiver: recipientPublicKey,
      amount: amount.toString()
    });
    
    // Create deeplink URL
    const transactionUrl = `https://backpack.app/send?${params.toString()}`;
    
    // Log transaction details
    console.log(`Sending ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
    console.log("Redirecting to Backpack:", transactionUrl);
    
    // Redirect to Backpack
    window.location.href = transactionUrl;
  } catch (error) {
    console.error("Error sending transaction via Backpack:", error);
  }
};