import { FC } from 'react';

interface BiometricPromptProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  action: 'connect' | 'transaction';
}

const BiometricPrompt: FC<BiometricPromptProps> = ({ 
  isOpen, 
  onCancel, 
  onConfirm, 
  action 
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    // Check if device has Touch ID or Face ID based on user agent
    const isTouchIdDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return isTouchIdDevice ? 'Touch ID' : 'Face ID';
  };

  const getMessage = () => {
    return action === 'connect' 
      ? 'Use biometrics to connect' 
      : 'Use biometrics to sign transaction';
  };

  return (
    <div className="fixed inset-0 bg-[#131418]/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-11/12 max-w-sm p-6 relative animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#FAFBFF] mx-auto flex items-center justify-center mb-4">
            <i className="fas fa-fingerprint text-[#00E5B0] text-4xl"></i>
          </div>
          <h3 className="text-xl font-bold mb-2">{getTitle()}</h3>
          <p className="text-sm text-[#474A57]">{getMessage()}</p>
        </div>
        <div className="flex justify-center space-x-3">
          <button 
            onClick={onCancel} 
            className="py-3 px-6 rounded-xl text-[#474A57] font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="bg-gradient-to-r from-[#7857FF] to-[#6447CC] py-3 px-8 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-[#7857FF]/30 transition-all duration-300"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default BiometricPrompt;
