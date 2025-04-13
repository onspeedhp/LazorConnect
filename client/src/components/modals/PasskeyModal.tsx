import { FC } from 'react';

interface PasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const PasskeyModal: FC<PasskeyModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#131418]/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-11/12 max-w-sm p-6 relative animate-slide-up">
        <button 
          className="absolute top-4 right-4 text-[#9FA3B5]" 
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#00E5B0] mx-auto flex items-center justify-center mb-4 animate-passkey-pulse">
            <i className="fas fa-fingerprint text-white text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">Authenticate with Passkey</h3>
          <p className="text-sm text-[#474A57]">Use biometrics to securely connect to Solana</p>
        </div>
        <div className="flex justify-center">
          <button 
            onClick={onConfirm} 
            className="bg-gradient-to-r from-[#7857FF] to-[#6447CC] py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasskeyModal;
