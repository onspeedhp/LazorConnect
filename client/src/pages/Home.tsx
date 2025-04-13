import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import WelcomeSection from '@/components/WelcomeSection';
import Dashboard from '@/components/Dashboard';
import PasskeyModal from '@/components/modals/PasskeyModal';
import WalletModal from '@/components/modals/WalletModal';
import TransactionModal from '@/components/modals/TransactionModal';
import BiometricPrompt from '@/components/modals/BiometricPrompt';
import { Transaction as TransactionType } from '@shared/schema';
import LazorKit from '@/lib/lazorKit';
import { connectWallet, disconnectWallet } from '@/lib/walletAdapter';
import { useToast } from "@/hooks/use-toast";

type ConnectionMethod = 'passkey' | 'phantom' | null;
type TransactionStatus = 'processing' | 'success' | 'error';

export default function Home() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [balance, setBalance] = useState<number>(2.45); // Mockup for demo

  // Modal states
  const [showPasskeyModal, setShowPasskeyModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState<boolean>(false);
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>('processing');
  const [biometricAction, setBiometricAction] = useState<'connect' | 'transaction'>('connect');
  
  const { toast } = useToast();

  // Load CSS for FontAwesome
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(link);
    
    // Add animations to global styles
    const style = document.createElement('style');
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

  const handleConnectPasskey = () => {
    setShowPasskeyModal(true);
  };

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleConfirmPasskey = () => {
    setShowPasskeyModal(false);
    setBiometricAction('connect');
    setShowBiometricPrompt(true);
  };

  const handleSimulateWalletConnect = () => {
    setShowWalletModal(false);
    simulateDelay(() => {
      connectWithPhantom();
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
        setConnectionMethod('passkey');
        setIsConnected(true);
        toast({
          title: "Connected with Passkey",
          description: "You are now connected using biometric authentication."
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect with passkey.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error connecting with passkey:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with passkey.",
        variant: "destructive"
      });
    }
  };

  const connectWithPhantom = async () => {
    try {
      const publicKey = await connectWallet();
      if (publicKey) {
        setWalletAddress(publicKey);
        setConnectionMethod('phantom');
        setIsConnected(true);
        toast({
          title: "Connected with Phantom",
          description: "You are now connected using Phantom wallet."
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect with Phantom wallet.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error connecting with Phantom:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting with Phantom.",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async () => {
    if (connectionMethod === 'phantom') {
      await disconnectWallet();
    } else if (connectionMethod === 'passkey') {
      await LazorKit.disconnect();
    }
    
    setIsConnected(false);
    setConnectionMethod(null);
    setWalletAddress('');
    toast({
      title: "Disconnected",
      description: "You've been disconnected from your wallet."
    });
  };

  const handleSendTransaction = () => {
    if (connectionMethod === 'passkey') {
      setBiometricAction('transaction');
      setShowBiometricPrompt(true);
    } else {
      // For Phantom, show the transaction modal directly
      setTransactionStatus('processing');
      setShowTransactionModal(true);
      simulateDelay(() => {
        setTransactionStatus('success');
        addTransaction(0.001, true, 'phantom');
      }, 2000);
    }
  };

  const handleBiometricConfirm = () => {
    setShowBiometricPrompt(false);
    
    if (biometricAction === 'connect') {
      connectWithPasskey();
    } else {
      // Handle transaction with passkey
      setTransactionStatus('processing');
      setShowTransactionModal(true);
      simulateDelay(() => {
        setTransactionStatus('success');
        addTransaction(0.001, true, 'passkey');
      }, 800); // Passkey is faster
    }
  };

  const handleBiometricCancel = () => {
    setShowBiometricPrompt(false);
    
    if (biometricAction === 'transaction') {
      // Show transaction failed if the biometric was for a transaction
      setTransactionStatus('error');
      setShowTransactionModal(true);
      addTransaction(0.001, false, 'passkey');
    }
  };

  const addTransaction = (amount: number, success: boolean, method: 'passkey' | 'phantom') => {
    const newTransaction: TransactionType = {
      id: `tx_${Date.now()}`,
      amount,
      success,
      timestamp: new Date(),
      connectionMethod: method
    };
    
    setTransactions(prev => [newTransaction, ...prev]);
    
    // Update balance if transaction was successful
    if (success) {
      setBalance(prev => prev - amount - 0.000005); // Subtract amount + fee
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
            connectionMethod={connectionMethod as 'passkey' | 'phantom'} 
            walletAddress={walletAddress}
            onDisconnect={handleDisconnect}
            onSendTransaction={handleSendTransaction}
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
        connectionMethod={connectionMethod as 'passkey' | 'phantom'}
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
