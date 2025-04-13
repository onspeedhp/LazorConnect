import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import PhantomDeepLinkHandler from "@/components/PhantomDeepLinkHandler";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Special routes for Phantom Wallet deeplinks */}
      <Route path="/onConnect" component={Home} />
      <Route path="/onDisconnect" component={Home} />
      <Route path="/onSignAndSendTransaction" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      {/* This component monitors and processes Phantom deeplink URLs */}
      <PhantomDeepLinkHandler />
      <Router />
      <Toaster />
    </>
  );
}

export default App;
