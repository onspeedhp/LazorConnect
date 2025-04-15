import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import WelcomeSection from "@/components/WelcomeSection";
import Dashboard from "@/components/Dashboard";
import PasskeyModal from "@/components/modals/PasskeyModal";
import WalletModal from "@/components/modals/WalletModal";
import TransactionModal from "@/components/modals/TransactionModal";
import BiometricPrompt from "@/components/modals/BiometricPrompt";
import PerformanceMetrics from "@/components/PerformanceMetrics";
import { ClientTransaction } from "@shared/schema";
import LazorKit from "@/lib/lazorKit";
import { usePhantomWallet } from "@/hooks/use-phantom-wallet";
import { useBackpackWallet } from "@/hooks/use-backpack-wallet";
import { useToast } from "@/hooks/use-toast";

type ConnectionMethod = "passkey" | "backpack" | null;
type TransactionStatus = "processing" | "success" | "error";

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMethod, setConnectionMethod] =
    useState<ConnectionMethod>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  
  // Load saved transactions from localStorage on mount
  useEffect(() => {
    try {
      const savedTransactions = localStorage.getItem('solana_transactions');
      if (savedTransactions) {
        const parsedTx = JSON.parse(savedTransactions) as Array<any>;
        // Convert ISO date strings back to Date objects
        setTransactions(parsedTx.map(tx => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        })));
        console.log("Loaded transactions from localStorage:", parsedTx.length);
      }
    } catch (e) {
      console.warn('Could not load transactions from localStorage', e);
    }
  }, []);
  const [balance, setBalance] = useState<number>(0);
  const [isAirdropLoading, setIsAirdropLoading] = useState<boolean>(false);

  // Modal states
  const [showPasskeyModal, setShowPasskeyModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showBiometricPrompt, setShowBiometricPrompt] =
    useState<boolean>(false);
  const [showTransactionModal, setShowTransactionModal] =
    useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] =
    useState<TransactionStatus>("processing");
  const [biometricAction, setBiometricAction] = useState<
    "connect" | "transaction"
  >("connect");
  
  // Track transaction performance metrics
  const [transactionStartTime, setTransactionStartTime] = useState<number | null>(null);

  // Use our custom wallet hooks
  const { 
    connectPhantom, 
    processConnectionResponse: processPhantomResponse,
    processTransactionResponse: processPhantomTransactionResponse,
    disconnectPhantom, 
    getWalletBalance: getPhantomBalance, 
    requestAirdrop: requestPhantomAirdrop, 
    sendTransaction: sendPhantomTransaction,
    checkForWalletResponse: checkForPhantomResponse 
  } = usePhantomWallet();
  
  // Use Backpack wallet hook
  const {
    connectBackpack,
    processConnectionResponse: processBackpackResponse,
    disconnectBackpack,
    getWalletBalance: getBackpackBalance,
    requestAirdrop: requestBackpackAirdrop,
    sendTransaction: sendBackpackTransaction,
    checkForWalletResponse: checkForBackpackResponse
  } = useBackpackWallet();
  
  const { toast } = useToast();

  // Load CSS for FontAwesome
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    document.head.appendChild(link);

    // Add animations to global styles
    const style = document.createElement("style");
    style.textContent = `
      @keyframes passkey-pulse {
        0% { box-shadow: 0 0 0 0 rgba(0, 229, 176, 0.2); }
        100% { box-shadow: 0 0 0 10px rgba(0, 229, 176, 0); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes bounce {
        from { transform: translateY(0); }
        to { transform: translateY(-5px); }
      }
      
      .animate-passkey-pulse {
        animation: passkey-pulse 1.5s infinite alternate;
      }
      
      .animate-fade-in {
        animation: fadeIn 0.5s ease-in-out;
      }
      
      .animate-slide-up {
        animation: slideUp 0.3s ease-out;
      }
      
      .animate-bounce {
        animation: bounce 0.5s ease infinite alternate;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
  }, []);

  // Function to add a new transaction to the history with performance metrics
  const addTransaction = (
    amount: number,
    success: boolean,
    method: "passkey" | "backpack",
    duration?: number,
  ) => {
    // Calculate duration if not provided but we have a start time
    let txDuration = duration;
    if (!txDuration && transactionStartTime) {
      txDuration = Date.now() - transactionStartTime;
      console.log(`Calculated transaction duration: ${txDuration}ms for ${method}`);
    }
    
    const newTransaction: ClientTransaction = {
      id: `tx_${Date.now()}`,
      amount,
      success,
      timestamp: new Date(),
      connectionMethod: method,
      duration: txDuration
    };
    
    // Reset the transaction start time
    setTransactionStartTime(null);
    
    // Add to transactions list
    setTransactions((prev) => [newTransaction, ...prev]);
    
    // Also store in localStorage for persistence between sessions
    try {
      const updatedTransactions = [newTransaction, ...transactions];
      localStorage.setItem('solana_transactions', JSON.stringify(
        updatedTransactions.map(tx => ({
          ...tx,
          timestamp: tx.timestamp.toISOString() // Convert Date to string for storage
        }))
      ));
    } catch (e) {
      console.warn('Could not save transaction to localStorage', e);
    }
  };

  // Parse hash fragments for transaction callbacks
  const parseTransactionHash = useCallback(() => {
    const hash = window.location.hash;
    if (!hash) return null;
    
    // Check for our new pure hash format (most reliable for mobile)
    if (hash.startsWith('#phantom-tx-')) {
      return {
        type: 'phantom',
        timestamp: hash.replace('#phantom-tx-', '')
      };
    }
    
    // Also check for older format for backward compatibility
    if (hash.startsWith('#phantom_transaction')) {
      return {
        type: 'phantom',
        timestamp: hash.split('timestamp=')[1]
      };
    }
    
    return null;
  }, []);
  
  // Handle hash-based transaction responses
  useEffect(() => {
    // Function to process hash changes for transaction responses
    const handleHashChange = () => {
      const txData = parseTransactionHash();
      if (!txData) return;
      
      console.log("Transaction response received via hash:", txData);
      
      let transactionSuccess = true;
      let signature = null;
      const transactionAmount = 0.001;
      
      // Use our new transaction response handler to get the data
      if (txData.type === 'phantom') {
        const transactionData = processPhantomTransactionResponse(window.location.href);
        
        if (transactionData) {
          console.log("Processed transaction data from hash:", transactionData);
          
          // Check if we have a signature property
          if ('signature' in transactionData) {
            signature = transactionData.signature;
            toast({
              title: "Transaction Confirmed",
              description: `Transaction signed with signature: ${signature.toString().substring(0, 8)}...`,
            });
          } else {
            // No signature but transaction was processed
            toast({
              title: "Transaction Confirmed",
              description: "Your transaction was processed successfully!",
            });
          }
        } else {
          // If we couldn't extract transaction data, still proceed as success
          // but log a warning
          console.warn("Could not extract transaction data from hash");
          toast({
            title: "Transaction Processed",
            description: "Your transaction was processed by the wallet",
          });
        }
      }
      
      // Update transaction UI
      setTransactionStatus("success");
      // Keep the modal showing
      setShowTransactionModal(true);
      
      // Record the transaction with timing data if available
      let duration;
      try {
        const startTimeStr = localStorage.getItem("tx_start_time");
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr);
          duration = Date.now() - startTime;
          console.log(`Hash-based transaction took ${duration}ms to complete`);
          
          // Clear the start time after use
          localStorage.removeItem("tx_start_time");
        }
      } catch (e) {
        console.warn("Error calculating hash-based transaction duration:", e);
      }
      
      addTransaction(transactionAmount, true, "backpack", duration);
      
      // Update balance after a short delay
      setTimeout(async () => {
        if (isConnected && walletAddress) {
          try {
            let newBalance = 0;
            if (connectionMethod === "backpack") {
              newBalance = await getPhantomBalance(walletAddress);
            } else if (connectionMethod === "passkey") {
              newBalance = await LazorKit.getBalance();
            }
            setBalance(newBalance);
          } catch (error) {
            console.error("Error updating balance after transaction:", error);
            // Use estimation if actual update fails
            setBalance(prev => prev - transactionAmount - 0.000005);
          }
        }
      }, 2000);
      
      // Clear the hash without page reload
      window.history.replaceState(null, document.title, window.location.pathname);
    };
    
    // Check for hash on mount
    handleHashChange();
    
    // Add listener for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [parseTransactionHash, toast, addTransaction, connectionMethod,
      getPhantomBalance, isConnected, walletAddress, processPhantomTransactionResponse]);
  
  // Check for wallet callback in URL
  useEffect(() => {
    // Check if we have a wallet callback in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    // Check if we have a pending transaction in localStorage
    const hasPendingTransaction = localStorage.getItem("phantom_transaction_pending") === "true";
    
    // Handle wallet connection callbacks
    if (action && (action === 'phantom_connect' || action === 'backpack_connect')) {
      try {
        // Enhanced logging for debugging
        console.log(`${action === 'phantom_connect' ? 'Phantom' : 'Backpack'} connection callback received`);
        console.log("Full URL:", window.location.href);
        console.log("URL parameters:");
        urlParams.forEach((value, key) => {
          // Truncate long values for readability
          const displayValue = value.length > 30 
            ? `${value.substring(0, 30)}...` 
            : value;
          console.log(`  ${key}: ${displayValue}`);
        });
        
        // Check for connection ID parameter (helps correlate request and response)
        const connectionId = urlParams.get('connection_id');
        if (connectionId) {
          try {
            const idStorageKey = action === 'phantom_connect' ? "phantom_connection_id" : "backpack_connection_id";
            const timestampKey = action === 'phantom_connect' ? "phantom_connection_timestamp" : "backpack_connection_timestamp";
            const storedConnectionId = localStorage.getItem(idStorageKey);
            const timestamp = localStorage.getItem(timestampKey);
            console.log("Connection tracking:", {
              received: connectionId,
              stored: storedConnectionId,
              timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : 'none'
            });
          } catch (e) {
            console.log("Could not read connection tracking data from localStorage");
          }
        }
        
        // Process connection response from the URL
        let publicKey: string | null = null;
        let walletType: "backpack" | null = null;
        
        if (action === 'phantom_connect') {
          const response = processPhantomResponse(window.location.href);
          if (response && response.publicKey) {
            publicKey = response.publicKey;
            walletType = "backpack"; // Phantom uses "backpack" for UI compatibility
            console.log("Successfully processed Phantom connection:", {
              publicKey: response.publicKey,
              session: response.session
            });
          }
        } else if (action === 'backpack_connect') {
          publicKey = processBackpackResponse(window.location.href);
          if (publicKey) {
            walletType = "backpack";
            console.log("Successfully processed Backpack connection:", publicKey);
          }
        }
        
        if (publicKey && walletType) {
          toast({
            title: "Wallet Connected",
            description: `Successfully connected with ${action === 'phantom_connect' ? 'Phantom' : 'Backpack'} wallet!`,
          });
          
          setWalletAddress(publicKey);
          setConnectionMethod(walletType);
          setIsConnected(true);
        } else {
          // If we couldn't get the public key, show an error
          throw new Error(`Could not process ${action === 'phantom_connect' ? 'Phantom' : 'Backpack'} connection. URL: ${window.location.href}`);
        }
      } catch (error) {
        console.error(`Error processing ${action === 'phantom_connect' ? 'Phantom' : 'Backpack'} connection:`, error);
        toast({
          title: "Connection Error",
          description: "Error processing wallet connection response.",
          variant: "destructive",
        });
      }
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle wallet transaction callbacks
    if (action && (action === 'phantom_transaction' || action === 'backpack_transaction')) {
      const walletType = action === 'phantom_transaction' ? 'Phantom' : 'Backpack';
      let transactionSuccess = true;
      let signature = null;
      
      // For Phantom's encrypted transaction response
      if (action === 'phantom_transaction') {
        try {
          // For properly encrypted transactions, Phantom provides data, nonce params
          const data = urlParams.get('data');
          const nonce = urlParams.get('nonce');
          
          // Check for error first
          if (urlParams.has('errorCode') || urlParams.has('errorMessage')) {
            transactionSuccess = false;
            toast({
              title: "Transaction Failed",
              description: urlParams.get('errorMessage') || "Transaction was rejected",
              variant: "destructive",
            });
          } 
          // Try to decrypt transaction response if available
          else if (data && nonce) {
            // Attempt to decrypt the response using our shared secret
            try {
              // Decrypt the payload to get transaction result
              const transactionData = processPhantomResponse(window.location.href);
              
              // Check if we have transaction data
              if (transactionData) {
                // For future signature support - Phantom may add this later
                if ('signature' in transactionData) {
                  // @ts-ignore - Phantom will add this in the future
                  const txSignature = transactionData.signature as string;
                  signature = txSignature;
                  transactionSuccess = true;
                  
                  toast({
                    title: "Transaction Confirmed",
                    description: `Transaction signed with signature: ${txSignature.substring(0, 8)}...`,
                  });
                } else {
                  // No signature but transaction was processed
                  transactionSuccess = true;
                  toast({
                    title: "Transaction Sent",
                    description: "Transaction was processed by wallet",
                  });
                }
              } else {
                console.warn("Transaction response had no signature");
                transactionSuccess = true; // Still mark as successful as it wasn't rejected
                toast({
                  title: "Transaction Sent",
                  description: `Transaction was processed by Phantom wallet`,
                });
              }
            } catch (decryptError) {
              console.error("Failed to decrypt transaction response:", decryptError);
              transactionSuccess = false;
              toast({
                title: "Transaction Processing Error",
                description: "Could not verify transaction result",
                variant: "destructive",
              });
            }
          } 
          // Simple response with just a signature
          else if (urlParams.has('signature')) {
            const urlSignature = urlParams.get('signature');
            signature = urlSignature;
            transactionSuccess = true;
            toast({
              title: "Transaction Sent",
              description: urlSignature 
                ? `Transaction signed with signature: ${urlSignature.substring(0, 8)}...`
                : "Transaction was processed successfully",
            });
          } 
          // No structured response
          else {
            // Assume success if no error code is present
            transactionSuccess = true;
            toast({
              title: "Transaction Sent",
              description: `Your transaction was processed by Phantom wallet!`,
            });
          }
        } catch (error) {
          console.error("Error processing transaction response:", error);
          transactionSuccess = false;
          toast({
            title: "Transaction Error",
            description: "An unexpected error occurred while processing the transaction response",
            variant: "destructive",
          });
        }
      } 
      // For Backpack's transaction response handling
      else {
        let signatureParam = urlParams.get('signature');
        
        if (urlParams.has('errorCode') || urlParams.has('errorMessage')) {
          transactionSuccess = false;
          toast({
            title: "Transaction Failed",
            description: urlParams.get('errorMessage') || "Transaction was not completed",
            variant: "destructive",
          });
        } else {
          signature = signatureParam;
          toast({
            title: "Transaction Sent",
            description: signatureParam 
              ? `Transaction signed with signature: ${signatureParam.substring(0, 8)}...` 
              : `Your transaction was processed by wallet!`,
          });
        }
      }
      
      // For demo purposes
      const transactionAmount = 0.001;
      setTransactionStatus(transactionSuccess ? "success" : "error");
      setShowTransactionModal(true);
      
      // Record the transaction with the correct wallet type and duration
      const connectionType = action === 'phantom_transaction' ? "backpack" : "backpack";
      
      // Calculate transaction duration if we have a start time in localStorage
      let duration;
      try {
        const startTimeStr = localStorage.getItem("tx_start_time");
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr);
          duration = Date.now() - startTime;
          console.log(`Transaction took ${duration}ms to complete via ${connectionType}`);
          
          // Remove the start time after use
          localStorage.removeItem("tx_start_time");
        }
      } catch (e) {
        console.warn("Error calculating transaction duration:", e);
      }
      
      // Add the transaction with all metrics
      addTransaction(transactionAmount, transactionSuccess, connectionType, duration);
      
      // Update balance if transaction was successful
      if (transactionSuccess) {
        // Refresh the actual balance after a short delay
        setTimeout(async () => {
          if (isConnected && walletAddress) {
            try {
              let newBalance = 0;
              if (connectionMethod === "backpack") {
                newBalance = await getPhantomBalance(walletAddress);
              } else if (connectionMethod === "passkey") {
                newBalance = await LazorKit.getBalance();
              }
              setBalance(newBalance);
            } catch (error) {
              console.error("Error updating balance after transaction:", error);
              // Use estimation if actual update fails
              setBalance(prev => prev - transactionAmount - 0.000005);
            }
          }
        }, 2000);
      }
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clear the pending transaction flag
      try {
        localStorage.removeItem("phantom_transaction_pending");
        localStorage.removeItem("phantom_transaction_timestamp");
      } catch (e) {
        console.warn("Could not clear transaction data from localStorage");
      }
    }
    // Also handle the case where we have a pending transaction in localStorage
    // but no URL parameters (this happens if the user manually closed Phantom)
    else if (hasPendingTransaction && !action) {
      // Check how long the transaction has been pending
      try {
        const timestamp = localStorage.getItem("phantom_transaction_timestamp");
        const pendingTime = timestamp ? Date.now() - parseInt(timestamp) : 0;
        
        // If it's been pending for more than 2 minutes, assume it was cancelled
        if (pendingTime > 120000) {
          toast({
            title: "Transaction Cancelled",
            description: "The transaction appears to have been cancelled or timed out",
            variant: "destructive",
          });
          
          setTransactionStatus("error");
          setShowTransactionModal(true);
          
          // Clear the pending transaction flag
          localStorage.removeItem("phantom_transaction_pending");
          localStorage.removeItem("phantom_transaction_timestamp");
        }
        // Otherwise, just show that it's still processing
        else if (!showTransactionModal) {
          setTransactionStatus("processing");
          setShowTransactionModal(true);
          toast({
            title: "Transaction Processing",
            description: "Your transaction is still being processed...",
          });
        }
      } catch (e) {
        console.warn("Error handling pending transaction:", e);
      }
    }
  }, [processPhantomResponse, processBackpackResponse, toast, showTransactionModal]);

  // Load wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && walletAddress) {
        try {
          let currentBalance = 0;
          if (connectionMethod === "backpack") {
            currentBalance = await getPhantomBalance(walletAddress); // Use Phantom for now
          } else if (connectionMethod === "passkey") {
            currentBalance = await LazorKit.getBalance();
          }
          setBalance(currentBalance);
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      }
    };

    fetchBalance();
  }, [isConnected, walletAddress, connectionMethod, getPhantomBalance]);

  const handleRequestAirdrop = async () => {
    if (!isConnected || isAirdropLoading) return;

    setIsAirdropLoading(true);
    toast({
      title: "Requesting Airdrop",
      description: "Requesting 1 SOL from the Solana Devnet...",
    });

    try {
      let signature = null;
      if (connectionMethod === "backpack") {
        signature = await requestPhantomAirdrop(walletAddress, 1);
      } else if (connectionMethod === "passkey") {
        signature = await LazorKit.requestAirdrop(1);
      }

      if (signature) {
        // Update balance after successful airdrop
        if (connectionMethod === "backpack") {
          const newBalance = await getPhantomBalance(walletAddress);
          setBalance(newBalance);
        } else {
          const newBalance = await LazorKit.getBalance();
          setBalance(newBalance);
        }

        toast({
          title: "Airdrop Successful",
          description: "1 SOL has been added to your wallet!",
          variant: "default",
        });
      } else {
        toast({
          title: "Airdrop Failed",
          description: "Failed to request airdrop from Solana Devnet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error requesting airdrop:", error);
      toast({
        title: "Airdrop Error",
        description: "An error occurred while requesting the airdrop.",
        variant: "destructive",
      });
    } finally {
      setIsAirdropLoading(false);
    }
  };

  const handleConnectPasskey = () => {
    setShowPasskeyModal(true);
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleConfirmPasskey = () => {
    setShowPasskeyModal(false);
    setBiometricAction("connect");
    setShowBiometricPrompt(true);
  };
  
  // Helper function for simulating delays in UI
  const simulateDelay = (callback: () => void, delay: number) => {
    setTimeout(callback, delay);
  };

  const connectWithPasskey = async () => {
    try {
      const publicKey = await LazorKit.connectWithPasskey();
      if (publicKey) {
        setWalletAddress(publicKey);
        setConnectionMethod("passkey");
        setIsConnected(true);
        toast({
          title: "Connected with Passkey",
          description: "You are now connected using biometric authentication.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect with passkey.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting with passkey:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with passkey.",
        variant: "destructive",
      });
    }
  };

  const connectWithBackpack = () => {
    try {
      // This will redirect to Backpack wallet
      connectBackpack();
      
      // No need to set wallet address here, as it will be handled in the URL callback
      toast({
        title: "Connection Initiated",
        description: "Redirecting to Backpack wallet for connection...",
      });
    } catch (error) {
      console.error("Error connecting with Backpack:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with Backpack wallet.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      if (connectionMethod === "backpack") {
        // If connected with Phantom
        if (walletAddress.startsWith('P')) {
          await disconnectPhantom();
        } else {
          // If connected with Backpack
          await disconnectBackpack();
        }
      } else if (connectionMethod === "passkey") {
        await LazorKit.disconnect();
      }

      setIsConnected(false);
      setConnectionMethod(null);
      setWalletAddress("");
      toast({
        title: "Disconnected",
        description: "You've been disconnected from your wallet.",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast({
        title: "Disconnect Error",
        description: "An error occurred while disconnecting. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendTransaction = async () => {
    // Start timing the transaction
    setTransactionStartTime(Date.now());
    
    if (connectionMethod === "passkey") {
      setBiometricAction("transaction");
      setShowBiometricPrompt(true);
    } else {
      // For Phantom wallet, send via deeplink redirection with encrypted payload
      const transactionAmount = 0.001;
      
      toast({
        title: "Transaction Initiated",
        description: "Preparing secure transaction for Phantom wallet...",
      });
      
      // Use a simulated recipient for demo
      const recipientPublicKey = "A84X2Qpt1btdKYL1vChg7iAY23ZX4GjA5WwdcZ9pyQTk";
      
      try {
        // Store transaction start time in localStorage as well for resilience
        localStorage.setItem("tx_start_time", Date.now().toString());
        
        // This will handle the transaction creation, encryption, and redirect to Phantom
        await sendPhantomTransaction(walletAddress, recipientPublicKey, transactionAmount);
        
        // Show transaction processing status
        setTransactionStatus("processing");
        setShowTransactionModal(true);
        
        // Note: The final result will be handled when the user is redirected back
        // via the phantom_transaction URL parameter or hash in the useEffect hooks
      } catch (error) {
        console.error("Error initiating transaction:", error);
        toast({
          title: "Transaction Error",
          description: "Failed to prepare transaction. Please try again.",
          variant: "destructive",
        });
        
        // Clear the transaction timing on error
        setTransactionStartTime(null);
        localStorage.removeItem("tx_start_time");
      }
    }
  };

  const handleBiometricConfirm = () => {
    setShowBiometricPrompt(false);

    if (biometricAction === "connect") {
      connectWithPasskey();
    } else {
      // Handle transaction with passkey
      setTransactionStatus("processing");
      setShowTransactionModal(true);
      
      // Passkey transactions are typically much faster than mobile wallet transactions
      // Use a fixed time to simulate this for demonstration purposes, but it should
      // reflect the difference in timing between passkey and wallet transactions
      const passkeySampleDuration = 800; // milliseconds
      
      simulateDelay(() => {
        setTransactionStatus("success");
        
        // Calculate transaction duration from start time or use the simulated time
        let duration;
        if (transactionStartTime) {
          duration = Date.now() - transactionStartTime;
        } else {
          duration = passkeySampleDuration;
        }
        
        // Add transaction with duration
        addTransaction(0.001, true, "passkey", duration);
      }, passkeySampleDuration);
    }
  };

  const handleBiometricCancel = () => {
    setShowBiometricPrompt(false);

    if (biometricAction === "transaction") {
      // Show transaction failed if the biometric was for a transaction
      setTransactionStatus("error");
      setShowTransactionModal(true);
      
      // Calculate duration even for failed transactions
      let duration;
      if (transactionStartTime) {
        duration = Date.now() - transactionStartTime;
      }
      
      // Record failed transaction
      addTransaction(0.001, false, "passkey", duration);
      
      // Reset transaction timing
      setTransactionStartTime(null);
    }
  };



  return (
    <div className="max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col bg-[#FAFBFF]">
      <Header isConnected={isConnected} />

      <main className="flex-1">
        {!isConnected ? (
          <WelcomeSection
            onConnectPasskey={handleConnectPasskey}
            onConnectWallet={handleConnectWallet}
          />
        ) : (
          <Dashboard
            connectionMethod={connectionMethod as "passkey" | "backpack"}
            walletAddress={walletAddress}
            onDisconnect={handleDisconnect}
            onSendTransaction={handleSendTransaction}
            onRequestAirdrop={handleRequestAirdrop}
            balance={balance}
            transactions={transactions}
          />
        )}
      </main>

      {/* Modals */}
      <PasskeyModal
        isOpen={showPasskeyModal}
        onClose={() => setShowPasskeyModal(false)}
        onConfirm={handleConfirmPasskey}
      />

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        status={transactionStatus}
        connectionMethod={connectionMethod as "passkey" | "backpack"}
        amount={0.001}
      />

      <BiometricPrompt
        isOpen={showBiometricPrompt}
        onCancel={handleBiometricCancel}
        onConfirm={handleBiometricConfirm}
        action={biometricAction}
      />
    </div>
  );
}
