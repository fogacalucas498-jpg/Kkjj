import { useState } from "react";
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

export default function App() {
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
