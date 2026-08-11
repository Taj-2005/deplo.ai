import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Terminal } from "@/components/landing/Terminal";
import { Cli } from "@/components/landing/Cli";
import { Integrations } from "@/components/landing/Integrations";
import { Features } from "@/components/landing/Features";
import { Trust } from "@/components/landing/Trust";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <AuthPageShell />
      <Navbar />
      <main id="main-content" role="main" aria-label="Main content" className="flex flex-col">
        <Hero />
        <HowItWorks />
        <Terminal />
        <Cli />
        <Integrations />
        <Features />
        <Trust />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
