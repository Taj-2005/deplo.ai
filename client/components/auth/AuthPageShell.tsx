"use client";

import { Suspense } from "react";
import { AuthAlert } from "./AuthAlert";

function AuthAlertFallback() {
  return null;
}

export function AuthPageShell() {
  return (
    <Suspense fallback={<AuthAlertFallback />}>
      <AuthAlert />
    </Suspense>
  );
}
