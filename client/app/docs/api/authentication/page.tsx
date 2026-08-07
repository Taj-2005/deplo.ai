import type { Metadata } from "next";
import { PageTitle, H2, P, A, Code, Callout, DocTable, Tr, Td } from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { ApiEndpoint } from "@/components/docs/ApiEndpoint";

export const metadata: Metadata = {
  title: "Authentication",
  description: "GitHub OAuth endpoints, JWTs, CLI tokens, and the current-user endpoint.",
};

export default function ApiAuthentication() {
  return (
    <>
      <PageTitle lead="deplo.ai has exactly one identity provider: GitHub. Signing in via OAuth creates the account and yields a browser JWT; API consumers then mint long-lived CLI tokens from that session. Both token types authenticate every endpoint in this reference.">
        Authentication
      </PageTitle>

      <H2>Getting a token as an API consumer</H2>
      <P>
        The OAuth endpoints below are redirect flows designed for a browser — they end by handing a JWT to the
        dashboard, not by returning JSON to your script. To call the API from code:
      </P>
      <DocTable head={["Step", "What to do"]}>
        <Tr>
          <Td mono>1</Td>
          <Td>
            Sign in at <A href="https://www.deplo.in">deplo.in</A> with GitHub (this is the only OAuth step you ever
            perform manually).
          </Td>
        </Tr>
        <Tr>
          <Td mono>2</Td>
          <Td>
            Create a CLI token in <strong>Settings</strong> — or via{" "}
            <A href="/docs/api/cli-tokens">POST /cli-tokens</A> if you already hold a token.
          </Td>
        </Tr>
        <Tr>
          <Td mono>3</Td>
          <Td>
            Send it as <Code>Authorization: Bearer dpl_…</Code> on every request. CLI tokens never expire; revoke them
            any time.
          </Td>
        </Tr>
      </DocTable>
      <Callout type="note">
        JWTs are for the browser. They are issued per sign-in, expire after 7 days, and are what the dashboard stores.
        Scripts and CI should always use <Code>dpl_</Code> tokens — see{" "}
        <A href="/docs/api/cli-tokens">CLI Tokens</A> and the{" "}
        <A href="/docs/cli/authentication">CLI authentication guide</A>.
      </Callout>

      <H2>OAuth endpoints</H2>

      <ApiEndpoint
        method="GET"
        path="/api/v1/auth/github"
        auth="public"
        description="Starts the GitHub OAuth flow. Responds 302, redirecting the browser to GitHub's authorize page with the scopes read:user, user:email, repo, and admin:repo_hook. Open this URL in a browser — it is not a JSON endpoint."
      >
        <CodeBlock
          language="http"
          title="response · 302"
          code={`HTTP/1.1 302 Found
Location: https://github.com/login/oauth/authorize?client_id=…&redirect_uri=…&scope=read%3Auser+user%3Aemail+repo+admin%3Arepo_hook`}
        />
      </ApiEndpoint>

      <ApiEndpoint
        method="GET"
        path="/api/v1/auth/github/callback"
        auth="public"
        description="System endpoint — GitHub redirects here after the user authorizes. It exchanges the ?code for an access token, creates or updates the user, and 302-redirects to the dashboard with a fresh JWT (…/auth/callback?token=…&userId=…). On failure it redirects to the app with ?auth=failed; a missing code returns 400. You never call this yourself."
      />

      <H2>Current user</H2>

      <ApiEndpoint
        method="GET"
        path="/api/v1/auth/me"
        auth="bearer"
        description="Returns the profile of the user the bearer token resolves to. Works identically with a JWT or a dpl_ CLI token — useful as a token validity check."
      >
        <DocTable head={["Field", "Type", "Description"]}>
          <Tr>
            <Td mono>userId</Td>
            <Td mono>string</Td>
            <Td>The user&apos;s id (cuid).</Td>
          </Tr>
          <Tr>
            <Td mono>email</Td>
            <Td mono>string</Td>
            <Td>Primary email from GitHub.</Td>
          </Tr>
          <Tr>
            <Td mono>name</Td>
            <Td mono>string</Td>
            <Td>Display name.</Td>
          </Tr>
          <Tr>
            <Td mono>githubLogin</Td>
            <Td mono>string</Td>
            <Td>GitHub username.</Td>
          </Tr>
          <Tr>
            <Td mono>avatarUrl</Td>
            <Td mono>string | null</Td>
            <Td>GitHub avatar URL.</Td>
          </Tr>
        </DocTable>
        <CodeBlock
          language="bash"
          title="request"
          code={`curl https://www.deplo.in/api/v1/auth/me \\
  -H "Authorization: Bearer $DEPLO_TOKEN"`}
        />
        <CodeBlock
          language="json"
          title="response · 200"
          code={`{
  "userId": "cm5xa1b2c0001njk8w9d2f3g4",
  "email": "ada@example.com",
  "name": "Ada Lovelace",
  "githubLogin": "adalovelace",
  "avatarUrl": "https://avatars.githubusercontent.com/u/9919?v=4"
}`}
        />
        <CodeBlock
          language="json"
          title="response · 401"
          code={`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  }
}`}
        />
      </ApiEndpoint>
    </>
  );
}
