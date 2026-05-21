import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";
import Image from "next/image";

function CallbackFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-white">
      <Image src="/logo.png" alt="deplo.ai" width={40} height={40} className="object-contain" />
      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
