import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PhantomResponseChecker from "@/components/PhantomResponseChecker";
import BackpackResponseHandler from "@/components/BackpackResponseHandler";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // When wallet connections are detected, they will be logged
  const handleWalletConnected = (publicKey: string) => {
    console.log("App: Wallet connected with public key:", publicKey);
    // The Home component will handle this through its own connection state
  };
  
  // When transactions are signed, they will be logged
  const handleTransactionSigned = (signature: string) => {
    console.log("App: Transaction signed with signature:", signature);
    // The Home component will handle this through its own transaction state
  };

  return (
    <>
      {/* These components monitor and process wallet responses */}
      <PhantomResponseChecker onWalletConnected={handleWalletConnected} />
      <BackpackResponseHandler 
        onWalletConnected={handleWalletConnected}
        onTransactionSigned={handleTransactionSigned}
      />
      <Router />
      <Toaster />
    </>
  );
}

export default App;
