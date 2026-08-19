"use client";

import { AuthAlert } from "./AuthAlert";
import { AuthedRedirect } from "./AuthedRedirect";

/** Landing-page auth concerns: sign-in failure alerts, and sending signed-in
 *  visitors straight to their dashboard. */
export function AuthPageShell() {
  return (
    <>
      <AuthedRedirect />
      <AuthAlert />
    </>
  );
}
