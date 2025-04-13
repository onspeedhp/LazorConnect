import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PhantomResponseChecker from "@/components/PhantomResponseChecker";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // When Phantom wallet connections are detected, it will be logged
  const handleWalletConnected = (publicKey: string) => {
    console.log("App: Phantom wallet connected with public key:", publicKey);
    // The Home component will handle this through its own connection state
  };

  return (
    <>
      {/* This component monitors and processes Phantom wallet responses */}
      <PhantomResponseChecker onWalletConnected={handleWalletConnected} />
      <Router />
      <Toaster />
    </>
  );
}

export default App;
