import { FC } from 'react';
import lazorLogo from '../assets/lazor-logo.png';

interface HeaderProps {
  isConnected: boolean;
}

const Header: FC<HeaderProps> = ({ isConnected }) => {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center">
        <div className="h-10 w-10 bg-[#7857FF] rounded-lg flex items-center justify-center overflow-hidden">
          <img src={lazorLogo} alt="Lazor Logo" className="h-10 w-10 object-cover" />
        </div>
        <h1 className="text-2xl font-bold ml-2 text-[#131418]">
          Lazor<span className="text-[#7857FF]">.kit</span>
        </h1>
      </div>
      
      {isConnected && (
        <div className="flex fade-in items-center bg-[#2C2E36] text-white text-xs py-1 px-3 rounded-full">
          <div className="h-2 w-2 rounded-full bg-[#00D170] mr-2"></div>
          <span>Connected</span>
        </div>
      )}
    </header>
  );
};

export default Header;
