import { useState, useEffect } from "react";
import Header from "@/components/Header";
import WelcomeSection from "@/components/WelcomeSection";
import Dashboard from "@/components/Dashboard";
import PasskeyModal from "@/components/modals/PasskeyModal";
import WalletModal from "@/components/modals/WalletModal";
import TransactionModal from "@/components/modals/TransactionModal";
import BiometricPrompt from "@/components/modals/BiometricPrompt";
import { ClientTransaction } from "@shared/schema";
import LazorKit from "@/lib/lazorKit";
import {
  connectPhantom,
  disconnectPhantom,
  requestAirdrop,
  getWalletBalance,
  sendTransaction,
  checkForWalletResponse,
  processConnectionResponse
} from "@/lib/phantomAdapter";
import { useToast } from "@/hooks/use-toast";

type ConnectionMethod = "passkey" | "backpack" | null;
type TransactionStatus = "processing" | "success" | "error";

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMethod, setConnectionMethod] =
    useState<ConnectionMethod>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
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

  // Check for wallet callback in URL
  useEffect(() => {
    // Check if we have a wallet callback in the URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle Phantom connection callback
    if (urlParams.has('action') && urlParams.get('action') === 'phantom_connect') {
      // In a real implementation, we would extract and validate data, nonce, etc.
      // For now, we can check if there's a public_key parameter that Phantom might send back
      let phantomPublicKey = urlParams.get('public_key');
      
      if (!phantomPublicKey) {
        // If not directly in URL, it might be in an encrypted payload like the example showed
        // For now, let's check for common parameters that might indicate a successful connection
        const hasPhantomParams = urlParams.has('phantom_encryption_public_key') || 
                                urlParams.has('data') || 
                                urlParams.has('nonce');
                                
        if (hasPhantomParams) {
          // Try to process the connection response
          // This is a simplified version - we would normally decrypt the data
          console.log("Phantom connection detected with encrypted payload");
          // In real implementation we would call processConnectionResponse here
          
          // For demo, we'll use user's input
          phantomPublicKey = prompt("Please paste your Phantom wallet address:", "");
        }
      }
      
      // If we have a public key, use it
      if (phantomPublicKey) {
        toast({
          title: "Wallet Connected",
          description: "Successfully connected with Phantom wallet!",
        });
        
        setWalletAddress(phantomPublicKey);
        setConnectionMethod("backpack"); // Keep as "backpack" for UI compatibility
        setIsConnected(true);
      } else {
        // If we couldn't get a public key, show an error
        toast({
          title: "Connection Failed",
          description: "Could not retrieve your Phantom wallet address.",
          variant: "destructive",
        });
      }
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Also check for transaction callback
    if (urlParams.has('action') && urlParams.get('action') === 'phantom_transaction') {
      // Handle transaction response
      let signatureParam = urlParams.get('signature');
      let transactionSuccess = true;
      
      // Check if there's an error parameter
      if (urlParams.has('errorCode') || urlParams.has('errorMessage')) {
        transactionSuccess = false;
        
        toast({
          title: "Transaction Failed",
          description: urlParams.get('errorMessage') || "Transaction was not completed",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Transaction Sent",
          description: signatureParam 
            ? `Transaction signed with signature: ${signatureParam.substring(0, 8)}...` 
            : "Your transaction was processed by Phantom wallet!",
        });
      }
      
      // For demo purposes
      const transactionAmount = 0.001;
      setTransactionStatus(transactionSuccess ? "success" : "error");
      setShowTransactionModal(true);
      addTransaction(transactionAmount, transactionSuccess, "backpack"); // Keep as "backpack" for UI compatibility
      
      // Update balance if transaction was successful
      if (transactionSuccess) {
        setBalance(prev => prev - transactionAmount - 0.000005); // Subtract amount + fee
      }
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && walletAddress) {
        try {
          let currentBalance = 0;
          if (connectionMethod === "backpack") {
            currentBalance = await getWalletBalance(walletAddress);
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
  }, [isConnected, walletAddress, connectionMethod]);

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
        signature = await requestAirdrop(walletAddress, 1);
      } else if (connectionMethod === "passkey") {
        signature = await LazorKit.requestAirdrop(1);
      }

      if (signature) {
        // Update balance after successful airdrop
        if (connectionMethod === "backpack") {
          const newBalance = await getWalletBalance(walletAddress);
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

  const handleSimulateWalletConnect = () => {
    setShowWalletModal(false);
    simulateDelay(() => {
      connectWithBackpack();
    }, 500);
  };

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
      // This will redirect to Phantom wallet
      connectPhantom();
      
      // No need to set wallet address here, as it will be handled in the URL callback
      toast({
        title: "Connection Initiated",
        description: "Redirecting to Phantom wallet for connection...",
      });
    } catch (error) {
      console.error("Error connecting with Phantom:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with Phantom wallet.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (connectionMethod === "backpack") {
      await disconnectPhantom();
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
  };

  const handleSendTransaction = async () => {
    if (connectionMethod === "passkey") {
      setBiometricAction("transaction");
      setShowBiometricPrompt(true);
    } else {
      // For Phantom wallet, send via deeplink redirection
      const transactionAmount = 0.001;
      
      toast({
        title: "Transaction Initiated",
        description: "Redirecting to Phantom wallet for approval...",
      });
      
      // Use a simulated recipient for demo
      const recipientPublicKey = "A84X2Qpt1btdKYL1vChg7iAY23ZX4GjA5WwdcZ9pyQTk";
      
      // Call the sendTransaction function which will redirect to Phantom
      sendTransaction(walletAddress, recipientPublicKey, transactionAmount);
      
      // Note: The result will be handled when the user is redirected back
      // via the phantom_transaction URL parameter in the useEffect hook
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
      simulateDelay(() => {
        setTransactionStatus("success");
        addTransaction(0.001, true, "passkey");
      }, 800); // Passkey is faster
    }
  };

  const handleBiometricCancel = () => {
    setShowBiometricPrompt(false);

    if (biometricAction === "transaction") {
      // Show transaction failed if the biometric was for a transaction
      setTransactionStatus("error");
      setShowTransactionModal(true);
      addTransaction(0.001, false, "passkey");
    }
  };

  const addTransaction = (
    amount: number,
    success: boolean,
    method: "passkey" | "backpack",
  ) => {
    const newTransaction: ClientTransaction = {
      id: `tx_${Date.now()}`,
      amount,
      success,
      timestamp: new Date(),
      connectionMethod: method,
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    // Update balance if transaction was successful
    if (success) {
      setBalance((prev) => prev - amount - 0.000005); // Subtract amount + fee
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
        onSimulateConnect={handleSimulateWalletConnect}
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
