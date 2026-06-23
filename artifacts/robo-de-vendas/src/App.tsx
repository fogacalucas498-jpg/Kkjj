import "./styles/app.css";
import { Switch, Route, Redirect } from "wouter";
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
import Profile from "./pages/app/Profile";

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

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
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#000000", fontFamily: "'Manrope', sans-serif", flexDirection: "column", gap: 16,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          <Route path="/app/profile">
            <ProtectedApp><Profile /></ProtectedApp>
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
