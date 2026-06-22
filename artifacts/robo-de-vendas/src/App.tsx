import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/auth";
import AppLayout from "./components/AppLayout";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import BadgesStrip from "./components/BadgesStrip";
import PlatformSection from "./components/PlatformSection";
import HowItWorks from "./components/HowItWorks";
import Benefits from "./components/Benefits";
import Pricing from "./components/Pricing";
import Blog from "./components/Blog";
import Security from "./components/Security";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/app/Dashboard";
import Agents from "./pages/app/Agents";
import AgentDetail from "./pages/app/AgentDetail";
import Conversations from "./pages/app/Conversations";
import ConversationDetail from "./pages/app/ConversationDetail";
import Settings from "./pages/app/Settings";

const qc = new QueryClient();

function LandingPage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <BadgesStrip />
      <PlatformSection />
      <HowItWorks />
      <Benefits />
      <Pricing />
      <Blog />
      <Security />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

function ProtectedApp({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07090f", color: "#25d366", fontFamily: "'Manrope', sans-serif", fontSize: 18 }}>
      Carregando...
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />

          <Route path="/app">
            <ProtectedApp><Dashboard /></ProtectedApp>
          </Route>
          <Route path="/app/agents">
            <ProtectedApp><Agents /></ProtectedApp>
          </Route>
          <Route path="/app/agents/:id">
            {(params) => <ProtectedApp><AgentDetail id={params.id} /></ProtectedApp>}
          </Route>
          <Route path="/app/conversations">
            <ProtectedApp><Conversations /></ProtectedApp>
          </Route>
          <Route path="/app/conversations/:id">
            {(params) => <ProtectedApp><ConversationDetail id={params.id} /></ProtectedApp>}
          </Route>
          <Route path="/app/settings">
            <ProtectedApp><Settings /></ProtectedApp>
          </Route>

          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}
