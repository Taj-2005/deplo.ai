import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Terminal } from "@/components/landing/Terminal";
import { Integrations } from "@/components/landing/Integrations";
import { Features } from "@/components/landing/Features";
import { Trust } from "@/components/landing/Trust";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main-content" role="main" aria-label="Main content" className="flex flex-col">
        <Hero />
        <HowItWorks />
        <Terminal />
        <Integrations />
        <Features />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
