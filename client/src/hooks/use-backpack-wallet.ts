import { useState, useCallback } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Connection to Solana devnet
const connection = new Connection('https://api.devnet.solana.com');

/**
 * Custom hook for Backpack wallet connection state and functions
 */
export function useBackpackWallet() {
  // Connection state
  const [walletState, setWalletState] = useState({
    publicKey: '',
    isConnected: false
  });

  // Helper function to store publicKey in localStorage
  const storePublicKeyInLocalStorage = (publicKey: string): void => {
    try {
      localStorage.setItem('backpack_public_key', publicKey);
      console.log("Stored public key in localStorage");
    } catch (error) {
      console.warn("Could not store public key in localStorage:", error);
    }
  };

  // Helper function to get publicKey from localStorage
  const getPublicKeyFromLocalStorage = (): string | null => {
    try {
      const publicKey = localStorage.getItem('backpack_public_key');
      return publicKey;
    } catch (error) {
      console.warn("Could not retrieve public key from localStorage:", error);
      return null;
    }
  };

  // Helper function to clear connection data from localStorage
  const clearConnectionDataFromLocalStorage = (): void => {
    try {
      localStorage.removeItem('backpack_public_key');
      console.log("Cleared connection data from localStorage");
    } catch (error) {
      console.warn("Could not clear data from localStorage:", error);
    }
  };

  // Connect to Backpack wallet via deeplink
  const connectBackpack = useCallback((): string => {
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
      return "";
    }
  }, []);

  // Process connection response from Backpack wallet
  const processConnectionResponse = useCallback((url: string): string | null => {
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
        // Store the public key in state and localStorage
        setWalletState({
          publicKey,
          isConnected: true
        });
        storePublicKeyInLocalStorage(publicKey);
        
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
  }, []);

  // Check if we have a wallet response in the URL
  const checkForWalletResponse = useCallback((): boolean => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('action') && urlParams.get('action') === 'backpack_connect';
    }
    return false;
  }, []);

  // Disconnect from Backpack wallet
  const disconnectBackpack = useCallback((): void => {
    try {
      // Create deeplink for disconnection
      const redirectUrl = `${window.location.origin}${window.location.pathname}?action=backpack_disconnect`;
      
      // Create deeplink URL
      const disconnectUrl = `https://backpack.app/disconnect?${new URLSearchParams({
        redirect_link: redirectUrl
      }).toString()}`;
      
      console.log("Disconnecting from Backpack:", disconnectUrl);
      
      // Clear state
      setWalletState({
        publicKey: '',
        isConnected: false
      });
      
      // Clear localStorage data
      clearConnectionDataFromLocalStorage();
      
      // Redirect to the deeplink
      window.location.href = disconnectUrl;
    } catch (error) {
      console.error("Error disconnecting from Backpack:", error);
      
      // Still clear connection state even if there was an error
      setWalletState({
        publicKey: '',
        isConnected: false
      });
      
      // Clear localStorage data
      clearConnectionDataFromLocalStorage();
    }
  }, []);

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
  const sendTransaction = useCallback((senderPublicKey: string, recipientPublicKey: string, amount: number): void => {
    if (!walletState.publicKey) {
      console.error("Not connected to Backpack");
      return;
    }

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
  }, [walletState.publicKey]);

  // Return all wallet methods and state
  return {
    walletState,
    connectBackpack,
    processConnectionResponse,
    checkForWalletResponse,
    disconnectBackpack,
    getWalletBalance,
    requestAirdrop,
    sendTransaction
  };
}