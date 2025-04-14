import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Buffer } from './buffer-polyfill';

// Solana connection to devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Generate a redirect URL for deep linking
const generateRedirectUrl = (type: 'connect' | 'disconnect' | 'transaction'): string => {
  // Use current URL as base for the redirect URL
  const baseUrl = window.location.origin;
  console.log(`Redirect links configured as:`, {
    connect: `${baseUrl}/?phantom=connect`,
    disconnect: `${baseUrl}/?phantom=disconnect`,
    transaction: `${baseUrl}/?phantom=transaction`,
  });
  return `${baseUrl}/?phantom=${type}`;
};

// Backpack deeplink URLs
const getBackpackDeepLink = (action: string, params: any = {}): string => {
  const baseUrl = window.location.origin;
  const redirectUri = `${baseUrl}:5000/?backpack=${action}`;
  
  // For connect action
  if (action === 'connect') {
    const connectUrl = `https://wallet.backpack.workers.dev/connect?redirect_uri=${encodeURIComponent(redirectUri)}`;
    console.log("Backpack redirect links configured:", {
      connect: redirectUri,
      transaction: `${baseUrl}:5000/?backpack=transaction`,
      disconnect: `${baseUrl}:5000/?backpack=disconnect`,
    });
    return connectUrl;
  }
  
  // For transaction action
  if (action === 'transaction') {
    // This would need the actual transaction details in a production app
    return `https://wallet.backpack.workers.dev/transfer?redirect_uri=${encodeURIComponent(redirectUri)}&amount=${params.amount || 0.001}&to=${params.recipient || ''}&from=${params.sender || ''}`;
  }
  
  return '';
};

const checkForWalletResponse = (): { action: string, publicKey?: string } | null => {
  console.log("Checking for Phantom wallet response in URL...");
  const urlParams = new URLSearchParams(window.location.search);
  const backpackAction = urlParams.get('backpack');
  
  if (backpackAction) {
    // In a real implementation, you would extract more data like publicKey
    // For now, we'll simulate it with static data
    return {
      action: backpackAction,
      publicKey: urlParams.get('publicKey') || 'Dm1quwTqbkGPCuXkKsEQRGRfMUzWhmx7DVdQbRFMkVJf'
    };
  }
  
  return null;
};

export const connectBackpack = (): void => {
  // Open Backpack wallet deeplink
  const deepLink = getBackpackDeepLink('connect');
  window.open(deepLink, '_blank');
};

export const disconnectBackpack = (): void => {
  localStorage.removeItem('backpackConnected');
  localStorage.removeItem('backpackAddress');
};

export const getWalletBalance = async (publicKey: string): Promise<number> => {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
};

export const requestAirdrop = async (publicKey: string, amount: number = 1): Promise<string | null> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const signature = await connection.requestAirdrop(
      pubKey,
      amount * LAMPORTS_PER_SOL
    );
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  } catch (error) {
    console.error("Error requesting airdrop:", error);
    return null;
  }
};

export const sendTransaction = (senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
  // With deeplinks, we redirect the user to the Backpack app to approve the transaction
  const params = {
    sender: senderPublicKey,
    recipient: recipientPublicKey,
    amount: amount
  };
  
  const deepLink = getBackpackDeepLink('transaction', params);
  window.open(deepLink, '_blank');
};

export { checkForWalletResponse };