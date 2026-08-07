import type { Metadata } from "next";
import {
  PageTitle,
  H2,
  P,
  A,
  Code,
  Callout,
  Ul,
  Li,
  DocTable,
  Tr,
  Td,
} from "@/components/docs/primitives";
import { CodeBlock } from "@/components/docs/CodeBlock";

export const metadata: Metadata = {
  title: "Configuration",
  description: "The config file, environment variables, and pointing the CLI at another API.",
};

export default function CliConfiguration() {
  return (
    <>
      <PageTitle lead="The CLI keeps configuration deliberately small: one JSON file holding your token, plus a handful of environment variables for CI and non-production instances.">
        Configuration
      </PageTitle>

      <H2>The config file</H2>
      <P>
        Everything the CLI persists lives in a single file at <Code>~/.config/deplo/config.json</Code>, written
        with file mode <Code>0600</Code> (readable and writable by your user only):
      </P>
      <CodeBlock
        language="json"
        title="~/.config/deplo/config.json"
        code={`{
  "token": "dpl_9f2c4e…",
  "apiUrl": "https://www.deplo.in/api/v1"
}`}
      />
      <Ul>
        <Li>
          <Code>token</Code> — your deplo CLI token, written by <Code>deplo login</Code> and deleted by{" "}
          <Code>deplo logout</Code>.
        </Li>
        <Li>
          <Code>apiUrl</Code> — optional API base override. Rarely set by hand; most people use{" "}
          <Code>DEPLO_API_URL</Code> instead (see below).
        </Li>
      </Ul>
      <Callout type="note" title="What is deliberately not stored">
        Provider credentials. Your Vercel OAuth token and Render API key never touch this machine — they are
        validated and stored AES-256-GCM encrypted on the platform when you run{" "}
        <Code>deplo connect</Code>. The config file holds exactly one deplo token, nothing else.
      </Callout>

      <H2>Environment variables</H2>
      <DocTable head={["Variable", "Meaning", "Default", "When to use"]}>
        <Tr>
          <Td mono>DEPLO_TOKEN</Td>
          <Td>Auth token; overrides the config file.</Td>
          <Td>—</Td>
          <Td>
            CI pipelines and ephemeral machines — nothing is written to disk. See <A href="/docs/cli/ci">CI Usage</A>.
          </Td>
        </Tr>
        <Tr>
          <Td mono>DEPLO_API_URL</Td>
          <Td>Base URL for the deplo REST API.</Td>
          <Td mono>https://www.deplo.in/api/v1</Td>
          <Td>Pointing the CLI at a local or staging deplo instance.</Td>
        </Tr>
        <Tr>
          <Td mono>DEPLO_WEB_URL</Td>
          <Td>
            Web origin hosting the <Code>/cli-auth</Code> page used by <Code>deplo login</Code>.
          </Td>
          <Td mono>https://www.deplo.in</Td>
          <Td>Only together with <Code>DEPLO_API_URL</Code> against a non-production instance.</Td>
        </Tr>
        <Tr>
          <Td mono>NO_COLOR</Td>
          <Td>Disables all colored output.</Td>
          <Td>—</Td>
          <Td>Plain-text logs; color is also dropped automatically when output is not a TTY.</Td>
        </Tr>
      </DocTable>

      <H2>Precedence</H2>
      <P>Environment variables always beat the config file; the config file beats the built-in default:</P>
      <Ul>
        <Li>
          <strong>Token:</strong> <Code>DEPLO_TOKEN</Code> → <Code>token</Code> in config.json.
        </Li>
        <Li>
          <strong>API base:</strong> <Code>DEPLO_API_URL</Code> → <Code>apiUrl</Code> in config.json →{" "}
          <Code>https://www.deplo.in/api/v1</Code>.
        </Li>
        <Li>
          <strong>Web origin:</strong> <Code>DEPLO_WEB_URL</Code> → <Code>https://www.deplo.in</Code> (not stored
          in the config file).
        </Li>
      </Ul>

      <H2>Pointing at a local or staging instance</H2>
      <P>
        Running the deplo platform locally (see{" "}
        <A href="/docs/concepts/project-structure">Project Structure</A>)? Point the CLI at it for one shell
        session:
      </P>
      <CodeBlock
        language="bash"
        title="local instance"
        code={`export DEPLO_API_URL=http://localhost:3000/api/v1
export DEPLO_WEB_URL=http://localhost:3000
deplo login
deplo whoami`}
      />
      <P>
        A trailing slash on either URL is stripped automatically. Remember that the token minted by a local
        instance only works against that instance — unset the variables (or open a new shell) to go back to
        production.
      </P>
    </>
  );
}
