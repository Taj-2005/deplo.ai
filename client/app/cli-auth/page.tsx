import { Suspense } from "react";
import { CliAuthClient } from "./CliAuthClient";
import Image from "next/image";

export const metadata = {
  title: "Authorize CLI — deplo.ai",
  robots: { index: false },
};

function Fallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white dark:bg-ds-bg">
      <Image src="/logo.png" alt="deplo.ai" width={40} height={40} className="object-contain dark:hidden" />
      <Image src="/logo-dark.png" alt="deplo.ai" width={40} height={40} className="object-contain hidden dark:block" />
      <div className="w-5 h-5 border-2 border-ds-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function CliAuthPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CliAuthClient />
    </Suspense>
  );
}
