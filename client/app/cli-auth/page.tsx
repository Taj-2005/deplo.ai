import { Suspense } from "react";
import { CliAuthClient } from "./CliAuthClient";
import { BrandLoader } from "@/components/BrandLoader";

export const metadata = {
  title: "Authorize CLI — deplo.ai",
  robots: { index: false },
};

function Fallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white dark:bg-ds-bg">
      <BrandLoader />
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
