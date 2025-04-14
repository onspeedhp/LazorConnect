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

// Connect to Backpack wallet
export const connectBackpack = (): string => {
  if (isMobile()) {
    // On mobile, we'd redirect to Backpack app via deeplink
    const redirectUrl = `${window.location.origin}${window.location.pathname}?action=wallet_callback`;
    
    // Simplified deeplink format for demo purposes
    const deeplink = `https://backpack.app/ul/v1/connect?app_url=example.com&redirect_link=${encodeURIComponent(redirectUrl)}&cluster=devnet`;
    
    // Log the deeplink for demonstration
    console.log(`Would redirect to Backpack via: ${deeplink}`);
    
    // In a real implementation, we would:
    // window.location.href = deeplink;
    
    // For demo purposes, return a simulated wallet address
    return "7bJdKSk3MBgN8DAVb1QY4rZRVrgZxfncqPQTfQjtDLzZ";
  } else {
    // For desktop demo, just return a simulated wallet address
    console.log("Simulating Backpack connection on desktop");
    return "7bJdKSk3MBgN8DAVb1QY4rZRVrgZxfncqPQTfQjtDLzZ";
  }
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

// Send a transaction
export const sendTransaction = (senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
  if (isMobile()) {
    // On mobile, we'd create a URL with transaction details and redirect to Backpack
    const redirectUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}?action=tx_callback`);
    
    // Simplified deeplink for demo purposes
    const deeplink = `https://backpack.app/ul/v1/signAndSendTransaction?redirect_link=${redirectUrl}`;
    
    // Log the deeplink for demonstration
    console.log(`Would send transaction via Backpack deeplink: ${deeplink}`);
    console.log(`Transaction details: ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
    
    // In a real implementation, we would:
    // window.location.href = deeplink;
  } else {
    // For desktop demo
    console.log(`Simulating sending ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
  }
};