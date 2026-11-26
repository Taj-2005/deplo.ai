import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
  Steps,
  Step,
  Ul,
  Li,
  Pill,
} from "@/components/docs/primitives";
import { getLatestAndroidApkUrl } from "@/lib/mobileRelease";

export const metadata: Metadata = {
  title: "Android App",
  description: "The deplo.ai Android app: current beta status, what it does, and how to install the APK.",
};

export default async function AndroidApp() {
  const apkUrl = await getLatestAndroidApkUrl();

  return (
    <>
      <PageTitle lead="A native Android app for watching deployments, triaging failures, and managing projects from your phone — distributed as a direct APK while it's in beta.">
        Android App <Pill variant="beta" />
      </PageTitle>

      <Callout type="tip" title="Download">
        <P>
          <A href={apkUrl}>Download the latest beta APK</A> — this link always points at the newest
          build published from the app&apos;s <Code>main</Code> branch, so it updates automatically
          as the app evolves; no need to bookmark a specific version.
        </P>
      </Callout>

      <H2>What it does</H2>
      <P>
        The app mirrors the parts of the dashboard you need away from a laptop: sign in with the same
        GitHub account, see every project and its latest deployment status, drill into a deployment&apos;s
        build log, retry or redeploy, and get push notifications when a deployment finishes or a project
        goes down. It talks to the same REST API as the dashboard and the CLI — nothing about your
        deployments is mobile-specific.
      </P>
      <Ul>
        <Li>Deployment health overview and a full history across every project.</Li>
        <Li>Per-deployment build logs, retry, redeploy, and cancel.</Li>
        <Li>Push notifications for deployment outcomes and project uptime changes.</Li>
        <Li>Biometric lock (Face ID / fingerprint) for resuming the app.</Li>
        <Li>Profile screen showing your Vercel and Render connection status.</Li>
      </Ul>

      <H2>Installing the beta APK</H2>
      <Steps>
        <Step title="Download the APK">
          <P>
            Use the <A href={apkUrl}>download link above</A> on your Android device, or transfer the
            file from a computer.
          </P>
        </Step>
        <Step title="Allow this install">
          <P>
            Because the app isn&apos;t distributed through the Play Store yet, Android will warn that
            it&apos;s from an unrecognized source. This is expected for a direct APK — tap{" "}
            <strong>Install anyway</strong> (wording varies by Android version; you may be prompted to
            allow installs from your browser or file manager once).
          </P>
        </Step>
        <Step title="Sign in">
          <P>
            Open the app and continue with GitHub — the same account you use on the dashboard and CLI.
            Vercel and Render stay connected per account, not per device, so nothing needs reconnecting.
          </P>
        </Step>
      </Steps>

      <Callout type="warning">
        Android only, for now — there is no iOS build yet. Push notifications and biometric lock both
        require a physical device; neither works in an emulator.
      </Callout>

      <H2>How the download link stays current</H2>
      <P>
        Every push to the app&apos;s <Code>main</Code> branch builds a fresh APK and publishes it as a
        GitHub release tagged to that commit. This page and the landing page both resolve the download
        link server-side against that repository&apos;s latest release, so the APK you get is always the
        one built from the most recent commit — no manually-updated links to go stale.
      </P>

      <H2>Feedback</H2>
      <P>
        Found a bug or something that behaves differently from the dashboard? Use the feedback widget on{" "}
        <A href="https://www.deplo.in">deplo.in</A>, or open an issue against the app directly if
        you&apos;re comfortable on GitHub.
      </P>
    </>
  );
}
