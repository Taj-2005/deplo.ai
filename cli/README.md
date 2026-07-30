# deplo-cli

Deploy full-stack apps into **your own** Vercel + Render accounts from the terminal.
Code goes in. Production URL comes out.

```bash
npx deplo-cli login    # sign in with GitHub in the browser
cd your-project
npx deplo-cli          # detect the stack, deploy, follow the live log
```

Or install globally and just use `deplo`:

```bash
npm i -g deplo-cli
deplo login
deplo
```

> Always `npx deplo-cli` — the bare `deplo` package on npm is not us.

## Commands

| Command | What it does |
|---|---|
| `deplo login` | GitHub sign-in via the browser; `--token` to paste a token from deplo.in → Settings (headless/CI) |
| `deplo connect vercel` | Authorize the Vercel integration (`--print-url` for headless machines) |
| `deplo connect render` | Connect Render with a Personal API key, masked prompt (`--key` for scripts) |
| `deplo whoami` | Account + provider connection checklist |
| `deplo` / `deplo deploy` | Deploy the repo in the current directory, follow the live log (`--yes` skips prompts) |
| `deplo status` | Latest deployment for this repo (`--all` for every project) |
| `deplo list` | All projects with status, stack, and URLs |
| `deplo logs [id]` | Deployment log; follows while active |
| `deplo open` | Open the frontend URL (`--api` backend, `--dash` monitoring dashboard) |
| `deplo logout` | Remove the stored token from this machine |

## Environment

- `DEPLO_TOKEN` — auth token for CI (`deplo deploy --yes` in a pipeline)
- `DEPLO_API_URL` — override the API base (default `https://www.deplo.in/api/v1`)
- `NO_COLOR` — disable colored output

Your deplo token is stored at `~/.config/deplo/config.json` (mode 0600). The CLI
never sees or stores your Vercel or Render credentials — those stay encrypted
server-side, connected once via `deplo connect`.

## Requirements

Node 20+, a GitHub account, and a repo with a GitHub remote.

---

Made by [deplo.ai](https://www.deplo.in) — MIT License
