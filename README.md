# DSH SSH Plugin

OpenSSH tools and the `/ssh` connection command for DeepSeek Harness 0.1.5-rc.2. The bundle runs independently of PI-Desktop and uses public Harness tools, commands, subprocess, approval and sandbox-policy services.

## Install

Requires Node.js 22.19+, local OpenSSH, and Python 3 on a POSIX remote host.

```sh
git clone https://github.com/hzxwonder-dsh-plugins/dsh-plugin-ssh.git
cd dsh-plugin-ssh
npm ci
dsh plugin --profile migration add "$PWD"
```

Use the same `DSH_HOME` for installation and startup. Restart Harness after changing bundles. Configure aliases, keys and host trust with OpenSSH; complete the first interactive `ssh <alias>` login in a terminal. Passwords and private keys never belong in tool arguments.

## Tool

`ssh` provides `hosts`, `probe`, `exec`, `list`, `read`, and `write`. Remote actions take `host` and an absolute `root`. File paths are relative to that root. Read returns a SHA-256 `revision`; write takes `baseRevision` or `missing` for a new file. Text is limited to 64 KiB. Writes use an advisory root lock and atomic replacement.

```json
{"action":"probe","host":"dev","root":"/srv/project"}
```

`exec` takes a shell `command`, returns the exit status and bounded output tails, and defaults to 60 seconds (maximum 300 seconds). A timeout or interrupted transport may leave a remote outcome uncertain. Inspect state before retrying.

## `/ssh`

The Harness Web command adapter discovers `/ssh`. Run `/ssh <host> <absolute-remote-root>` to probe the OpenSSH alias, verify the remote root, and report the remote platform and Python version. `/ssh` and `/ssh help` show the usage. The command does not put credentials in input, and it does not claim to create a Harness workspace.

Optional profile patch:

```yaml
- id: dsh-plugin-ssh
  config:
    hosts: [dev, staging]
```

## Authority and Compatibility

File operations reject traversal, symlinks, hard-linked regular files and reserved lock paths. This is accidental-path protection on a trusted remote filesystem, not isolation against hostile concurrent filesystem mutation. Shell execution has the remote account's full authority; `root` is its working directory, not an OS sandbox. Temporary command capture may consume disk until timeout. Local SSH configuration (including ProxyCommand) must be trusted.

Mutating operations refuse read-only sessions and require Harness approval unless the session grants full access. Missing approval infrastructure fails closed. Results and command arguments can be recorded in Harness session logs; keep secrets out of commands and files requested by the model.

Remote tools are explicit. Harness workspace selection, local bash, local filesystem tools and subagents continue to use their own configured local workspace. The official workspace API requires a local absolute path and local filesystem backend; a transparent whole-session SSH workspace is therefore not provided by this bundle. Use the `ssh` tool with the verified `host` and `root` on each remote operation.

## Validate

```sh
npm test
```

Tests cover local Python protocol behavior, CAS, bounds, traversal, symlink rejection, timeout, host validation, approval denial and the subprocess adapter contract. See [verification scenarios](docs/e2e.md). The unit suite does not authenticate to a real SSH server.

## License

LGPL-3.0-only. The migration draws on PI-Desktop's remote-workspace behavior; see [NOTICE](NOTICE). Dependencies retain their own licenses.
