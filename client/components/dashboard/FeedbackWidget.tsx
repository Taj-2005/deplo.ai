"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bug, Check, Lightbulb, MessageSquare, MessageSquarePlus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sendFeedback, type FeedbackType } from "@/lib/dashboard-api";
import { APP_VERSION } from "@/lib/version";

/**
 * Floating feedback launcher (bottom-right, dashboard only).
 *
 * Reporting friction is the enemy: the form is two fields, and every piece of
 * reproduction context — page, viewport, user agent, deployment id — is
 * captured automatically rather than asked for. Identity comes from the
 * session server-side, so the reply lands with the right person.
 */

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug; hint: string }[] = [
  { key: "BUG", label: "Bug", icon: Bug, hint: "Something broke or behaved unexpectedly" },
  { key: "IDEA", label: "Idea", icon: Lightbulb, hint: "Something that would make deplo.ai better" },
  { key: "OTHER", label: "Other", icon: MessageSquare, hint: "Anything else you want to tell us" },
];

const MIN_LENGTH = 10;

export function FeedbackWidget() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("BUG");
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the message field once the panel has painted.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => textareaRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = useCallback(() => {
    setMessage("");
    setSteps("");
    setError(null);
    setSent(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Let the exit animation finish before wiping the form.
    setTimeout(reset, 250);
  }, [reset]);

  const submit = async () => {
    if (message.trim().length < MIN_LENGTH || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendFeedback({
        type,
        message: message.trim(),
        ...(type === "BUG" && steps.trim() ? { steps: steps.trim() } : {}),
        context: {
          path: pathname,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          appVersion: APP_VERSION,
          occurredAt: new Date().toISOString(),
          // Deep pages carry the record being looked at — invaluable for repro.
          ...(pathname.match(/\/dashboard\/(?:deployments|monitoring)\/([^/]+)/)?.[1]
            ? { deploymentId: pathname.split("/").pop() as string }
            : {}),
        },
      });
      setSent(true);
      setTimeout(close, 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that — please try again.");
    } finally {
      setSending(false);
    }
  };

  // Signed-out visitors have no identity to attach; the landing page has its
  // own contact route.
  if (!isAuthenticated) return null;

  const tooShort = message.trim().length > 0 && message.trim().length < MIN_LENGTH;

  return (
    <>
      {/* Launcher */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close feedback" : "Send feedback"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-40 flex h-11 items-center gap-2 border border-ds-outline-variant bg-ds-surface px-4 text-[13px] font-medium text-ds-on-surface shadow-lg hover:border-ds-outline hover:shadow-xl transition-all"
      >
        {open ? (
          <X size={15} strokeWidth={1.5} />
        ) : (
          <MessageSquarePlus size={15} strokeWidth={1.5} className="text-ds-on-variant" />
        )}
        <span className="hidden sm:inline">{open ? "Close" : "Feedback"}</span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Send feedback"
            className="fixed bottom-20 right-5 z-40 w-[min(calc(100vw-2.5rem),380px)] border border-ds-outline-variant bg-ds-surface shadow-2xl"
          >
            {/* Accent bar — the brand gradient, used once */}
            <div className="h-[3px] bg-gradient-to-r from-[#00D2FF] to-[#7928CA]" />

            {sent ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center border border-green-300 dark:border-green-900 text-green-600 dark:text-green-400">
                  <Check size={18} strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-ds-on-surface">Thank you — that helps.</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ds-on-variant">
                  It landed in our inbox with everything needed to reproduce it. We reply to{" "}
                  <span className="font-mono">{user?.email}</span>.
                </p>
              </div>
            ) : (
              <div className="px-5 py-4">
                <h2 className="text-[15px] font-semibold text-ds-on-surface">What&apos;s on your mind?</h2>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ds-on-variant">
                  Goes straight to the team — we read every one.
                </p>

                {/* Type selector */}
                <div className="mt-4 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Feedback type">
                  {TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = type === t.key;
                    return (
                      <button
                        key={t.key}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setType(t.key)}
                        className={`flex flex-col items-center gap-1 border px-2 py-2.5 text-[12px] transition-colors ${
                          active
                            ? "border-ds-primary bg-ds-surface-low text-ds-on-surface font-medium"
                            : "border-ds-outline-variant text-ds-on-variant hover:text-ds-on-surface hover:border-ds-outline"
                        }`}
                      >
                        <Icon size={14} strokeWidth={1.5} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11.5px] text-ds-on-variant">
                  {TYPES.find((t) => t.key === type)?.hint}
                </p>

                {/* Message */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder={
                    type === "BUG"
                      ? "What happened, and what did you expect instead?"
                      : type === "IDEA"
                        ? "What would you like deplo.ai to do?"
                        : "Tell us anything…"
                  }
                  className="mt-3 w-full resize-none border border-ds-outline-variant bg-ds-surface-low px-3 py-2.5 text-[13.5px] leading-relaxed text-ds-on-surface placeholder:text-ds-outline focus:outline-none focus:border-ds-primary transition-colors"
                />

                {/* Repro steps — only where they earn their space */}
                {type === "BUG" && (
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    rows={3}
                    maxLength={5000}
                    placeholder="Steps to reproduce (optional) — 1. Open… 2. Click… 3. See…"
                    className="mt-2 w-full resize-none border border-ds-outline-variant bg-ds-surface-low px-3 py-2.5 text-[13px] leading-relaxed text-ds-on-surface placeholder:text-ds-outline focus:outline-none focus:border-ds-primary transition-colors"
                  />
                )}

                {error && (
                  <p className="mt-2 text-[12px] leading-relaxed text-red-600 dark:text-red-400">{error}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] leading-snug text-ds-on-variant">
                    Sent as <span className="font-mono">{user?.email}</span> with this page&apos;s technical
                    details attached.
                  </p>
                  <button
                    onClick={submit}
                    disabled={message.trim().length < MIN_LENGTH || sending}
                    className="shrink-0 bg-ds-primary px-4 py-2 text-[13px] font-semibold text-ds-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
                {tooShort && (
                  <p className="mt-1.5 text-[11px] text-ds-on-variant">
                    A little more detail helps — {MIN_LENGTH - message.trim().length} more characters.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
