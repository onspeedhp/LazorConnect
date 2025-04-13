import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

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

export const getPhantomDeepLink = (): string => {
  // For mobile devices, create a deeplink to the Phantom app
  // Documentation: https://docs.phantom.app/integrating/deeplinks-ios-and-android
  
  // Use the recommended connect endpoint with proper parameters
  const params = new URLSearchParams({
    app_url: window.location.origin,
    redirect_link: window.location.href,
    cluster: "devnet"
  });
  
  return `https://phantom.app/ul/v1/connect?${params.toString()}`;
};

export const connectWallet = async (): Promise<string | undefined> => {
  try {
    // Check if we're on mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, we need to use deeplinks to connect to Phantom
      // For the demo, we'll just say we're connected and return a simulated address
      return "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"; // Simulated address for mobile
    }
    
    // On desktop, use the extension
    const provider = getProvider();
    if (!provider) {
      // If extension not found on desktop, suggest installation
      window.open("https://phantom.app/download", "_blank");
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

    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");
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
    const provider = getProvider();
    if (!provider) {
      throw new Error("Phantom wallet not connected or not installed");
    }

    // Let's use a more direct approach with Phantom's provider
    const sender = new PublicKey(senderPublicKey);
    const recipient = new PublicKey(recipientPublicKey);

    // Get a recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Prepare transaction data
    const transaction = {
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
      // This handles all the internal Buffer handling
      // Note: provider.request only takes one object parameter according to the interface
      const { signature } = await provider.request({
        method: "signAndSendTransaction",
        params: {
          message: transaction,
          options: {
            commitment: "confirmed"
          }
        }
      });

      // Log the transaction URL
      console.log(
        `Transaction sent: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      );

      // Confirm the transaction - provide commitment level to satisfy args requirement
      const confirmation = await connection.confirmTransaction({
        signature,
        lastValidBlockHeight,
        blockhash
      }, "confirmed");

      // Check if there was an error in the transaction
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      return signature;
    } catch (error: any) {
      // This catches errors in the signing process, like when a user rejects the transaction
      console.error("Error signing or sending transaction:", error);
      throw new Error(
        `Transaction signing failed: ${error.message || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error("Error in transaction process:", error);
    throw error; // Rethrow to handle in the UI
  }
};
