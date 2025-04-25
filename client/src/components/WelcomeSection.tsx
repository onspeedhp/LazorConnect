import { FC } from 'react';
import lazorLogo from '../assets/lazor-logo.png';

interface WelcomeSectionProps {
  onConnectPasskey: () => void;
  onConnectWallet: () => void;
}

const WelcomeSection: FC<WelcomeSectionProps> = ({
  onConnectPasskey,
  onConnectWallet
}) => {
  return (
    <section className="mb-10 animate-slide-up">
      <h2 className="text-3xl font-bold mb-3 text-[#131418]">
        Simplified Solana <br/>Experience
      </h2>
      <p className="text-[#474A57] mb-6">
        Connect with passkey or wallet to experience the future of Solana dApps.
      </p>
      
      {/* Stats Comparison */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-8">
        <h3 className="text-lg font-semibold mb-4 text-[#131418]">Connection Methods Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 rounded-full bg-[#7857FF] flex items-center justify-center mr-2">
                <i className="fas fa-wallet text-white text-xs"></i>
              </div>
              <span className="text-sm font-medium">Traditional Wallet</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#9FA3B5]">Connection time</span>
                <span className="font-medium">~15 seconds</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9FA3B5]">Steps required</span>
                <span className="font-medium">3-5 steps</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9FA3B5]">External apps</span>
                <span className="font-medium">Required</span>
              </div>
            </div>
          </div>
          
          <div className="border border-[#7857FF]/30 bg-[#7857FF]/5 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 rounded-full bg-[#7857FF] flex items-center justify-center mr-2 overflow-hidden">
                <img src={lazorLogo} alt="Lazor Logo" className="w-6 h-6 object-cover" />
              </div>
              <span className="text-sm font-medium">Lazor Passkey</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#9FA3B5]">Connection time</span>
                <span className="font-medium text-[#00D170]">~3 seconds</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9FA3B5]">Steps required</span>
                <span className="font-medium text-[#00D170]">1 step</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9FA3B5]">External apps</span>
                <span className="font-medium text-[#00D170]">Not needed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Connection Methods */}
      <div className="space-y-4">
        <button
          onClick={onConnectPasskey}
          className="w-full bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md border-2 border-transparent hover:border-[#7857FF]/30 transition-all duration-300"
        >
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-[#7857FF] flex items-center justify-center mr-3 animate-passkey-pulse overflow-hidden">
              <img src={lazorLogo} alt="Lazor Logo" className="w-10 h-10 object-cover" />
            </div>
            <div className="flex-1 text-center">
              <h3 className="font-semibold text-lg">Connect with Passkey</h3>
              <p className="text-sm text-[#9FA3B5]">Use biometrics for secure, instant connection</p>
            </div>
          </div>
          <i className="fas fa-chevron-right text-[#9FA3B5]"></i>
        </button>
        
        <button
          onClick={onConnectWallet}
          className="w-full bg-white rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md border-2 border-transparent hover:border-[#7857FF]/30 transition-all duration-300"
        >
          <div className="flex items-center flex-1">
            <div className="w-10 h-10 rounded-full bg-[#7857FF] flex items-center justify-center mr-3">
              <i className="fas fa-wallet text-white"></i>
            </div>
            <div className="flex-1 text-center">
              <h3 className="font-semibold text-lg">Connect with Wallet</h3>
              <p className="text-sm text-[#9FA3B5]">Use your existing wallet apps</p>
            </div>
          </div>
          <i className="fas fa-chevron-right text-[#9FA3B5]"></i>
        </button>
      </div>
    </section>
  );
};

export default WelcomeSection;
