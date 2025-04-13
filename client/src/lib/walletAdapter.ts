import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  isPhantom?: boolean;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: () => void) => void;
  request: (method: any, params: any) => Promise<any>;
}

// Solana connection to devnet
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Checks if Phantom is installed and accessible
export const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana;
    // @ts-ignore
    if (provider && provider.isPhantom) {
      return provider as PhantomProvider;
    }
  }
  
  // If on mobile, deeplinking might be required
  // as Phantom might not be available as a window object
  return undefined;
};

export const getPhantomDeepLink = (): string => {
  // Base phantom URL for mobile connection
  return 'https://phantom.app/ul/v1/connect';
};

export const connectWallet = async (): Promise<string | undefined> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      // If on mobile, redirect to app store or prompt to install
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        window.open('https://phantom.app/download', '_blank');
      }
      return undefined;
    }
    
    const { publicKey } = await provider.connect();
    return publicKey.toString();
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    return undefined;
  }
};

export const disconnectWallet = async (): Promise<void> => {
  try {
    const provider = getProvider();
    if (provider) {
      await provider.disconnect();
    }
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
  }
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

export const sendTransaction = async (
  senderPublicKey: string,
  recipientPublicKey: string,
  amount: number
): Promise<string | undefined> => {
  try {
    const provider = getProvider();
    if (!provider) return undefined;
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const sender = new PublicKey(senderPublicKey);
    const recipient = new PublicKey(recipientPublicKey);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    
    // Get a recent blockhash to include in the transaction
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;
    
    // Sign the transaction
    const signedTransaction = await provider.signTransaction(transaction);
    
    // Send the transaction to the cluster
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm the transaction
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    console.error("Error sending transaction:", error);
    return undefined;
  }
};
