import { FC, useState } from 'react';
import { ClientTransaction } from '@shared/schema';
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  connectionMethod: 'passkey' | 'backpack';
  walletAddress: string;
  onDisconnect: () => void;
  onSendTransaction: () => void;
  onRequestAirdrop: () => void;
  balance: number;
  transactions: ClientTransaction[];
}

const Dashboard: FC<DashboardProps> = ({
  connectionMethod,
  walletAddress,
  onDisconnect,
  onSendTransaction,
  onRequestAirdrop,
  balance,
  transactions
}) => {
  const [amount, setAmount] = useState<number>(0.001);
  const { toast } = useToast();
  
  const truncateAddress = (address: string) => {
    return address.slice(0, 6) + '...' + address.slice(-6);
  };
  
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Address copied!",
      description: "Wallet address copied to clipboard",
    });
  };
  
  const formatDate = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  // Connection method benefits
  const connectionBenefits = {
    passkey: [
      "No wallet app needed - just use your fingerprint or face",
      "50% faster transactions than traditional wallets",
      "No extensions required",
      "Works on any device including mobile"
    ],
    backpack: [
      "Modern Solana-native wallet with deep mobile integration",
      "Multi-chain support with excellent UX",
      "Built for mobile-first usage with deeplinks",
      "Great for existing crypto users with built-in NFT support"
    ]
  };

  return (
    <section className="animate-fade-in">
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#131418]">Wallet</h3>
          <button 
            onClick={onDisconnect}
            className="text-xs text-[#9FA3B5] hover:text-[#FF4A5E] flex items-center"
          >
            <i className="fas fa-power-off mr-1"></i> Disconnect
          </button>
        </div>
        
        <div className="flex items-center justify-between bg-[#FAFBFF] rounded-lg p-3 mb-3">
          <div>
            <div className="flex items-center">
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-white ${
                  connectionMethod === 'passkey' ? 'bg-[#00E5B0]' : 'bg-[#7857FF]'
                }`}
              >
                <i className={`fas ${connectionMethod === 'passkey' ? 'fa-fingerprint' : 'fa-wallet'} text-xs`}></i>
              </div>
              <span className="text-sm font-medium">Connected via {connectionMethod === 'passkey' ? 'Passkey' : 'Backpack'}</span>
            </div>
            <p className="text-xs text-[#9FA3B5] font-mono mt-1">{truncateAddress(walletAddress)}</p>
          </div>
          <button 
            onClick={copyAddress}
            className="text-xs text-[#474A57] hover:text-[#7857FF]"
          >
            <i className="far fa-copy"></i>
          </button>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-[#9FA3B5]">Balance</p>
            <p className="text-2xl font-bold">{balance.toFixed(2)} SOL</p>
            <p className="text-xs text-[#9FA3B5]">≈ ${(balance * 20).toFixed(2)} USD</p>
            
            {balance < 0.1 && (
              <button
                onClick={onRequestAirdrop}
                className="mt-2 px-3 py-1.5 text-xs rounded-lg bg-[#00D170] text-white hover:bg-[#00B060] transition-colors flex items-center"
              >
                <i className="fas fa-coins mr-1.5"></i>
                Request Airdrop
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-[#00D170]">Solana Devnet</p>
          </div>
        </div>
      </div>
      
      {/* Transaction Section */}
      <h3 className="text-lg font-semibold mb-4">Test Transaction</h3>
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
        <p className="text-sm text-[#474A57] mb-4">
          Send a test transaction to compare the experience between connection methods.
        </p>
        
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-sm text-[#474A57] mb-1 block">Amount (SOL)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              min="0.001" 
              step="0.001" 
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7857FF]/30"
            />
          </div>
          
          <div>
            <label className="text-sm text-[#474A57] mb-1 block">Recipient (Demo Only)</label>
            <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#FAFBFF] text-[#474A57] text-sm font-mono">
              6jnxFp...Z5PnEM
            </div>
          </div>
        </div>
        
        <button 
          onClick={onSendTransaction}
          className="w-full py-3 px-6 rounded-xl text-white font-medium flex items-center justify-center bg-gradient-to-r from-[#7857FF] to-[#6447CC] hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
        >
          <i className="fas fa-paper-plane mr-2"></i>
          Send Transaction
        </button>
      </div>
      
      {/* Transaction History */}
      <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
      <div className="space-y-3 mb-6">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <div className="mb-4 text-[#9FA3B5]">
              <i className="fas fa-history text-3xl"></i>
            </div>
            <p className="text-sm text-[#474A57]">No transactions yet. Send a test transaction to see it here.</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center animate-slide-up">
              <div>
                <div className="flex items-center mb-1">
                  <div className={`w-6 h-6 rounded-full ${tx.success ? 'bg-[#00D170]' : 'bg-[#FF4A5E]'} flex items-center justify-center mr-2 text-white text-xs`}>
                    <i className={`fas ${tx.success ? 'fa-check' : 'fa-times'}`}></i>
                  </div>
                  <span className="font-medium">Send {tx.amount} SOL</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full ${tx.connectionMethod === 'passkey' ? 'bg-[#00E5B0]' : 'bg-[#7857FF]'} flex items-center justify-center mr-1`}>
                    <i className={`fas ${tx.connectionMethod === 'passkey' ? 'fa-fingerprint' : 'fa-wallet'} text-white text-xs`}></i>
                  </div>
                  <span className="text-xs text-[#9FA3B5]">Via {tx.connectionMethod}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#9FA3B5]">{formatDate(tx.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Connection Method Comparison */}
      <h3 className="text-lg font-semibold mb-4">Connection Method Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Passkey Column */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#00E5B0]">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-[#00E5B0] flex items-center justify-center mr-2 text-white">
              <i className="fas fa-fingerprint"></i>
            </div>
            <h4 className="text-lg font-semibold">Passkey Authentication</h4>
          </div>
          
          <ul className="space-y-2">
            {connectionBenefits.passkey.map((benefit, index) => (
              <li key={index} className="flex items-start">
                <span className="text-[#00E5B0] mr-2"><i className="fas fa-check-circle"></i></span>
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Backpack Column */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-[#7857FF]">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 rounded-full bg-[#7857FF] flex items-center justify-center mr-2 text-white">
              <i className="fas fa-wallet"></i>
            </div>
            <h4 className="text-lg font-semibold">Backpack Wallet</h4>
          </div>
          
          <ul className="space-y-2">
            {connectionBenefits.backpack.map((benefit: string, index: number) => (
              <li key={index} className="flex items-start">
                <span className="text-[#7857FF] mr-2"><i className="fas fa-info-circle"></i></span>
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
