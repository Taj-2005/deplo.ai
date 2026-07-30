import { execFileSync } from "node:child_process";

/** Resolve the current directory's GitHub remote to "owner/repo", or null. */
export function currentRepoFullName(): string | null {
  let remote: string;
  try {
    remote = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
  // git@github.com:owner/repo.git | https://github.com/owner/repo(.git)
  const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match?.[1] ?? null;
}

export function currentBranch(): string | null {
  try {
    return (
      execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}
