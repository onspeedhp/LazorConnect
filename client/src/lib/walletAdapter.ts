import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PhantomDeepLink } from './phantomUtils/deepLinkConnection';
import BackpackWallet from './backpackWallet';

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
  request: (options: {
    method: string;
    params?: any;
  }) => Promise<any>;
}

// Solana connection to devnet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

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

// Gets the Phantom deep link for direct connection
export const getPhantomDeepLink = (): string => {
  try {
    // We'll use the new encryption-based DeepLink approach
    const phantomInstance = PhantomDeepLink.getInstance();
    return phantomInstance.connect();
  } catch (error) {
    console.error("Error creating deeplink:", error);
    
    // Fallback to a simple deeplink if there's an error
    const params = new URLSearchParams({
      app_url: window.location.origin,
      redirect_link: window.location.href,
      cluster: "devnet"
    });
    
    return `https://phantom.app/ul/v1/connect?${params.toString()}`;
  }
};

// Type for wallet selection
export type WalletType = 'phantom' | 'backpack';

// Current wallet used by the application
let currentWallet: WalletType = 'backpack'; // Default to Backpack

// Set which wallet to use
export const setWalletType = (type: WalletType): void => {
  currentWallet = type;
  console.log(`Using ${type} wallet for connections`);
};

// Get current wallet type
export const getWalletType = (): WalletType => {
  return currentWallet;
};

export const connectWallet = async (): Promise<string | undefined> => {
  try {
    // Check if we're on mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      if (currentWallet === 'backpack') {
        // Use Backpack wallet
        console.log("Connecting with Backpack wallet");
        const backpackInstance = BackpackWallet.getInstance();
        backpackInstance.connect();
        // The actual connection will be handled by the BackpackResponseHandler
        return undefined;
      } else {
        // Use Phantom wallet
        console.log("Connecting with Phantom wallet");
        const phantomUrl = getPhantomDeepLink();
        console.log("Opening Phantom URL for mobile:", phantomUrl);
        window.location.href = phantomUrl;
        // The actual connection will be handled by the PhantomResponseChecker
        return undefined;
      }
    }
    
    // On desktop with Phantom
    if (currentWallet === 'phantom') {
      const provider = getProvider();
      if (!provider) {
        // If extension not found on desktop, suggest installation
        window.open("https://phantom.app/download", "_blank");
        return undefined;
      }
  
      const { publicKey } = await provider.connect();
      return publicKey.toString();
    }
    
    // On desktop with Backpack (still use deeplink approach for consistency)
    console.log("Connecting with Backpack wallet (desktop)");
    const backpackInstance = BackpackWallet.getInstance();
    backpackInstance.connect();
    return undefined;
  } catch (error) {
    console.error(`Error connecting to ${currentWallet} wallet:`, error);
    return undefined;
  }
};

export const disconnectWallet = async (): Promise<void> => {
  try {
    // Check if we're on mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (currentWallet === 'backpack') {
      // Use Backpack wallet for disconnection
      console.log("Disconnecting Backpack wallet");
      const backpackInstance = BackpackWallet.getInstance();
      backpackInstance.disconnect();
      return;
    }
    
    // Phantom wallet disconnection
    if (isMobile) {
      // On mobile, use the DeepLink approach for Phantom
      const phantomInstance = PhantomDeepLink.getInstance();
      const disconnectUrl = phantomInstance.disconnect();
      console.log("Opening Phantom disconnect URL:", disconnectUrl);
      window.location.href = disconnectUrl;
      return;
    }
    
    // On desktop, use the Phantom extension
    const provider = getProvider();
    if (provider) {
      await provider.disconnect();
    }
  } catch (error) {
    console.error(`Error disconnecting ${currentWallet} wallet:`, error);
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

export const requestAirdrop = async (
  publicKey: string,
  amount: number = 1,
): Promise<string | null> => {
  try {
    const pubKey = new PublicKey(publicKey);
    const signature = await connection.requestAirdrop(
      pubKey,
      amount * LAMPORTS_PER_SOL,
    );

    // Wait for confirmation with compatible method
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature
    });
    return signature;
  } catch (error) {
    console.error("Error requesting airdrop:", error);
    return null;
  }
};

export const sendTransaction = async (
  senderPublicKey: string,
  recipientPublicKey: string,
  amount: number,
): Promise<string | undefined> => {
  try {
    // Create a transaction
    const sender = new PublicKey(senderPublicKey);
    const recipient = new PublicKey(recipientPublicKey);
    
    // Create a transaction object
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sender;
    
    // Check if we're on mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (currentWallet === 'backpack') {
      // Use Backpack wallet for transaction
      console.log("Signing transaction with Backpack wallet");
      const backpackInstance = BackpackWallet.getInstance();
      backpackInstance.signAndSendTransaction(transaction);
      // The actual result will be processed by the BackpackResponseHandler
      return undefined;
    }
    
    // Phantom wallet transaction handling
    if (isMobile) {
      // Use deep linking to send the transaction with Phantom
      const phantomInstance = PhantomDeepLink.getInstance();
      const transactionUrl = phantomInstance.signAndSendTransaction(transaction);
      console.log("Opening Phantom transaction URL:", transactionUrl);
      window.location.href = transactionUrl;
      
      // The actual signature will be handled by the PhantomDeepLinkHandler
      return undefined;
    }
    
    // On desktop, use the Phantom extension
    const provider = getProvider();
    if (!provider) {
      throw new Error("Phantom wallet not connected or not installed");
    }

    // Prepare transaction data for Phantom desktop
    const transactionMessage = {
      blockhash,
      lastValidBlockHeight,
      feePayer: sender,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: amount * LAMPORTS_PER_SOL,
        }),
      ],
    };

    try {
      // Send the transaction using Phantom's sendTransaction method
      const { signature } = await provider.request({
        method: "signAndSendTransaction",
        params: {
          message: transactionMessage
        }
      });

      // Log the transaction URL
      console.log(
        `Transaction sent: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      );

      // Confirm the transaction
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        signature
      });

      // Check if there was an error in the transaction
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      return signature;
    } catch (error: any) {
      // This catches errors in the signing process
      console.error("Error signing or sending transaction:", error);
      throw new Error(
        `Transaction signing failed: ${error.message || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error(`Error in ${currentWallet} transaction process:`, error);
    throw error; // Rethrow to handle in the UI
  }
};
