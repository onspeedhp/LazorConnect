import { FC } from 'react';

type TransactionStatus = 'processing' | 'success' | 'error';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TransactionStatus;
  connectionMethod: 'passkey' | 'backpack';
  amount: number;
}

const TransactionModal: FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  status, 
  connectionMethod,
  amount
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="w-16 h-16 rounded-full bg-[#FFBB33]/20 mx-auto flex items-center justify-center mb-4">
            <i className="fas fa-circle-notch fa-spin text-[#FFBB33] text-2xl"></i>
          </div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 rounded-full bg-[#00D170]/20 mx-auto flex items-center justify-center mb-4">
            <i className="fas fa-check text-[#00D170] text-2xl"></i>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 rounded-full bg-[#FF4A5E]/20 mx-auto flex items-center justify-center mb-4">
            <i className="fas fa-times text-[#FF4A5E] text-2xl"></i>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'processing':
        return 'Processing Transaction';
      case 'success':
        return 'Transaction Successful';
      case 'error':
        return 'Transaction Failed';
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'processing':
        return 'Please wait while we process your transaction...';
      case 'success':
        return 'Your transaction has been confirmed on Solana devnet.';
      case 'error':
        return 'There was an error processing your transaction.';
    }
  };

  return (
    <div className="fixed inset-0 bg-[#131418]/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-11/12 max-w-sm p-6 relative animate-slide-up">
        <button 
          className="absolute top-4 right-4 text-[#9FA3B5]"
          onClick={onClose}
          style={{ display: status === 'processing' ? 'none' : 'block' }}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="text-center mb-6">
          {getIcon()}
          <h3 className="text-xl font-bold mb-2">{getTitle()}</h3>
          <p className="text-sm text-[#474A57]">{getMessage()}</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[#9FA3B5]">Amount</span>
            <span className="text-sm font-medium">{amount} SOL</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[#9FA3B5]">Fee</span>
            <span className="text-sm font-medium">0.000005 SOL</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[#9FA3B5]">Recipient</span>
            <span className="text-sm font-medium font-mono">6jnxFp...Z5PnEM</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-sm text-[#9FA3B5]">Method</span>
            <span className="text-sm font-medium">{connectionMethod === 'passkey' ? 'Passkey' : 'Backpack'}</span>
          </div>
        </div>
        <div className="flex justify-center">
          <button 
            onClick={onClose} 
            className="bg-gradient-to-r from-[#7857FF] to-[#6447CC] py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
            style={{ display: status === 'processing' ? 'none' : 'block' }}
          >
            {status === 'error' ? 'Try Again' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
