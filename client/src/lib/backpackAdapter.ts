import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

// This adapter provides methods for interacting with Backpack wallet via deeplinks
// For the demo, we'll mostly be simulating the interactions since browser environment
// makes it difficult to handle the actual deeplink return values

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
  return 'https://backpack.app';
};

// Connect to Backpack wallet via deeplink on mobile or return a simulated address on desktop
export const connectBackpack = (): string => {
  if (isMobile()) {
    // On mobile, we'd redirect to the Backpack app via deeplink
    // In a real implementation, we'd use a URL scheme like:
    // window.location.href = `backpack://connect?app=MyApp&redirect=${encodeURIComponent(window.location.href)}`;
    
    // Simulate getting a wallet address
    return "7bJdKSk3MBgN8DAVb1QY4rZRVrgZxfncqPQTfQjtDLzZ";
  } else {
    // For desktop demo, just return a simulated wallet address
    console.log("Simulating Backpack connection on desktop");
    return "7bJdKSk3MBgN8DAVb1QY4rZRVrgZxfncqPQTfQjtDLzZ";
  }
};

// Check for wallet response when returning from deeplink
export const checkForWalletResponse = (): boolean => {
  // In a real implementation, we'd check for URL parameters that Backpack would add when returning from the deeplink
  // For example, we might look for ?publicKey=xx&signature=yy parameters
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('publicKey');
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
    // const redirectUrl = encodeURIComponent(window.location.href);
    // window.location.href = `backpack://send?sender=${senderPublicKey}&recipient=${recipientPublicKey}&amount=${amount}&redirect=${redirectUrl}`;
    
    console.log(`Sending ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey} via Backpack deeplink`);
  } else {
    // For desktop demo
    console.log(`Simulating sending ${amount} SOL from ${senderPublicKey} to ${recipientPublicKey}`);
  }
};