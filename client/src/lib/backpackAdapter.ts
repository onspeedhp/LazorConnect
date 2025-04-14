import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// This adapter provides methods for interacting with Backpack wallet via deeplinks
// For the demo, we'll mostly simulate the interactions since browser environment
// makes it difficult to handle deeplink return values in a demonstration

// Connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com');

// Check if we're in a mobile environment
const isMobile = (): boolean => {
  if (typeof window !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
  return false;
};

// Get the Backpack deeplink for the app
export const getBackpackDeepLink = (): string => {
  // In a real app, this would generate a proper deeplink according to their documentation
  return 'https://backpack.app';
};

// Connect to Backpack wallet - returns empty string because we're redirecting
export const connectBackpack = (): string => {
  // Create the redirect URL to send the user back to our app
  const redirectUrl = `${window.location.origin}${window.location.pathname}?action=wallet_callback`;
  
  // Create the Backpack deeplink with proper parameters
  const deeplink = `https://backpack.app/ul/v1/connect?app_url=${encodeURIComponent('https://example.com')}&redirect_link=${encodeURIComponent(redirectUrl)}&cluster=devnet`;
  
  // Log the deeplink for debugging
  console.log(`Redirecting to Backpack via: ${deeplink}`);
  
  // Redirect the user to Backpack
  window.location.href = deeplink;
  
  // Return empty string since we're redirecting and don't have the address yet
  return "";
};

// Check for wallet response when returning from deeplink
export const checkForWalletResponse = (): boolean => {
  // In a real implementation, we'd check for URL parameters that Backpack would add
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('action') && urlParams.get('action') === 'wallet_callback';
  }
  return false;
};

// Disconnect from Backpack wallet
export const disconnectBackpack = (): void => {
  console.log("Disconnecting from Backpack wallet");
  // In a real implementation, we might need to clean up state or revoke permissions
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

// Send a transaction - redirects to Backpack for signing
export const sendTransaction = (senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
  // Create the redirect URL to send the user back to our app
  const redirectUrl = `${window.location.origin}${window.location.pathname}?action=tx_callback`;
  
  // In a production app, we would need to create and serialize a real transaction,
  // encrypt it according to Backpack's protocol, and include it in the payload.
  // For this demo, we'll use a simplified deeplink that won't actually send a transaction
  // but will demonstrate the redirect flow.
  
  // Simplified deeplink for demonstration
  const deeplink = `https://backpack.app/ul/v1/signAndSendTransaction?redirect_link=${encodeURIComponent(redirectUrl)}`;
  
  // Log transaction details for debugging
  console.log(`Transaction details: ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
  console.log(`Redirecting to Backpack via: ${deeplink}`);
  
  // Redirect the user to Backpack
  window.location.href = deeplink;
};