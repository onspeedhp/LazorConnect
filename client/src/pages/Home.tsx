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
  connectWallet,
  disconnectWallet,
  requestAirdrop,
  getWalletBalance,
  sendTransaction,
  setWalletType,
} from "@/lib/walletAdapter";
import { useToast } from "@/hooks/use-toast";

type ConnectionMethod = "passkey" | "phantom" | "backpack" | null;
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

  // Load wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && walletAddress) {
        try {
          let currentBalance = 0;
          if (connectionMethod === "phantom" || connectionMethod === "backpack") {
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
      if (connectionMethod === "phantom" || connectionMethod === "backpack") {
        signature = await requestAirdrop(walletAddress, 1);
      } else if (connectionMethod === "passkey") {
        signature = await LazorKit.requestAirdrop(1);
      }

      if (signature) {
        // Update balance after successful airdrop
        if (connectionMethod === "phantom" || connectionMethod === "backpack") {
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
      connectWithBackpack(); // Use Backpack as the default wallet
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

  const connectWithPhantom = async () => {
    try {
      // Check if user is on mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Get public key (real or simulated)
      const publicKey = await connectWallet();
      if (publicKey) {
        setWalletAddress(publicKey);
        setConnectionMethod("phantom");
        setIsConnected(true);
        
        // For demo purposes, start with some SOL
        simulateDelay(() => {
          setBalance(2.5); // Start with 2.5 SOL
        }, 500);
        
        toast({
          title: "Connected with Phantom",
          description: isMobile 
            ? "Connected using simulated Phantom wallet (mobile demo)" 
            : "You are now connected using Phantom wallet.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect with Phantom wallet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting with Phantom:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with Phantom.",
        variant: "destructive",
      });
    }
  };
  
  const connectWithBackpack = async () => {
    try {
      // Check if user is on mobile
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Set wallet type to Backpack before connecting
      setWalletType('backpack');
      
      // Get public key from Backpack
      const publicKey = await connectWallet();
      if (publicKey) {
        setWalletAddress(publicKey);
        setConnectionMethod("backpack");
        setIsConnected(true);
        
        // Fetch current balance
        const currentBalance = await getWalletBalance(publicKey);
        setBalance(currentBalance);
        
        toast({
          title: "Connected with Backpack",
          description: isMobile 
            ? "Connected to Backpack wallet via mobile" 
            : "You are now connected using Backpack wallet.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect with Backpack wallet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting with Backpack:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with Backpack.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (connectionMethod === "phantom" || connectionMethod === "backpack") {
      await disconnectWallet();
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
      // For wallet connections, show the transaction modal directly
      setTransactionStatus("processing");
      setShowTransactionModal(true);

      try {
        // Use a fake recipient address for demo purposes
        const recipientAddress = "DzGkwSr6HWt94DzSpKPvxnFWKX4xZG7r2aSwYk9iQEM6";
        const transactionAmount = 0.001;

        // Attempt to send the transaction through wallet
        const signature = await sendTransaction(
          walletAddress,
          recipientAddress,
          transactionAmount,
        );

        if (signature) {
          setTransactionStatus("success");
          toast({
            title: "Transaction Successful",
            description: "The SOL has been successfully sent!",
          });
          addTransaction(transactionAmount, true, connectionMethod as "phantom" | "backpack");

          // Update balance after successful transaction
          const newBalance = await getWalletBalance(walletAddress);
          setBalance(newBalance);
        } else {
          throw new Error("Transaction failed with no signature returned");
        }
      } catch (error: any) {
        console.error("Transaction error:", error);
        setTransactionStatus("error");
        toast({
          title: "Transaction Failed",
          description: error.message || "Failed to send transaction",
          variant: "destructive",
        });
        addTransaction(0.001, false, connectionMethod as "phantom" | "backpack");
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
    method: "passkey" | "phantom" | "backpack",
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
            connectionMethod={connectionMethod as "passkey" | "phantom" | "backpack"}
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
        connectionMethod={connectionMethod as "passkey" | "phantom" | "backpack"}
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
