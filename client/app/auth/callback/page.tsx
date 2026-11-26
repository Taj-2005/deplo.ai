import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";
import { BrandLoader } from "@/components/BrandLoader";

function CallbackFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white dark:bg-ds-bg">
      <BrandLoader />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
