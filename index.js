import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';

export const name = 'dsh-plugin-ssh';
export const inject = ['tools', 'subprocess'];
const worker = await readFile(new URL('./remote.py', import.meta.url), 'utf8');
const workerCommand = `python3 -c 'import base64;exec(base64.b64decode("${Buffer.from(worker).toString('base64')}"))'`;
const actions = ['hosts', 'probe', 'exec', 'list', 'read', 'write'];

export function validateTarget(host) {
  if (typeof host !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:@-]{0,253}$/.test(host)) {
    throw new Error('SSH_INVALID_HOST: use a configured alias or user@hostname');
  }
  return host;
}

export function parseHosts(text) {
  return [...new Set(text.split(/\r?\n/).flatMap(line => {
    const match = /^\s*Host\s+(.+?)(?:\s+#.*)?$/i.exec(line);
    return match ? match[1].split(/\s+/).filter(host => /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(host)) : [];
  }))].sort();
}

export async function runRemote(subprocess, args, exec, config = {}) {
  validateTarget(args.host);
  const timeoutMs = args.timeoutMs ?? 60000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) throw new Error('SSH_INVALID_TIMEOUT');
  if (config.hosts && !config.hosts.includes(args.host)) throw new Error('SSH_HOST_NOT_ALLOWED');
  if (typeof args.root !== 'string' || !args.root.startsWith('/') || args.root.includes('\0')) throw new Error('SSH_ABSOLUTE_ROOT_REQUIRED');
  if (args.action === 'exec' && (!args.command?.trim() || Buffer.byteLength(args.command) > 65536)) throw new Error('SSH_INVALID_COMMAND');
  if (args.action === 'write' && (typeof args.content !== 'string' || Buffer.byteLength(args.content) > 65536 || !/^(missing|[a-f0-9]{64})$/.test(args.baseRevision ?? ''))) throw new Error('SSH_WRITE_REQUIRES_CONTENT_AND_REVISION');
  const signal = AbortSignal.any([exec.signal, AbortSignal.timeout(timeoutMs + 15000)]);
  const program = await subprocess.resolveExecutable('ssh', undefined, signal);
  const handle = subprocess.spawn({
    argv: [program, '-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2', args.host, workerCommand],
    cwd: exec.agent?.session.header.cwd ?? homedir(),
    stdio: {
      stdin: {data: JSON.stringify({action: args.action, root: args.root, path: args.path ?? '.', command: args.command, content: args.content, baseRevision: args.baseRevision, timeout: timeoutMs / 1000})},
      stdout: {maxBytes: 512 * 1024}, stderr: {maxBytes: 16384},
    },
    graceMs: 1000, signal,
  });
  try {
    const result = await handle.done;
    signal.throwIfAborted();
    const output = handle.collected.stdout.readFrom(0);
    if (result.exitCode !== 0 || output.lossy) throw new Error('SSH_TRANSPORT_FAILED: check agent, known_hosts, alias and remote Python 3; remote outcome may be unknown');
    let value;
    try { value = JSON.parse(output.text); } catch { throw new Error('SSH_INVALID_RESPONSE: remote outcome may be unknown'); }
    if (!value.ok) throw new Error(value.error ?? 'SSH_REMOTE_FAILED');
    return value.result;
  } finally {
    handle.terminate();
    await handle.waitForExit(AbortSignal.timeout(5000));
  }
}

export function apply(ctx, config = {}) {
  if (config.hosts !== undefined && (!Array.isArray(config.hosts) || config.hosts.some(host => { try { validateTarget(host); return false; } catch { return true; } }))) throw new Error('SSH_INVALID_HOST_ALLOWLIST');
  ctx.tools.register(defineTool({
    name: 'ssh',
    description: 'Use local OpenSSH configuration and agent to probe hosts, execute remote shell commands and list/read/write remote UTF-8 files. First use hosts to discover explicit aliases in ~/.ssh/config (Include files are not enumerated; their aliases remain usable). All remote operations require host and an absolute remote root. Read returns a SHA-256 revision; write requires that revision or missing for a new file. Remote Python 3 is required. Establish host keys and login through your terminal. Commands have remote shell authority; request only user-authorized actions. File operations are root-confined; exec runs with remote account permissions. Timeout or transport failure can leave the remote outcome unknown; inspect before retrying writes.',
    parameters: {
      action: {type: 'string', enum: actions, required: true},
      host: {type: 'string'}, root: {type: 'string'}, path: {type: 'string'},
      command: {type: 'string'}, content: {type: 'string'}, baseRevision: {type: 'string'}, timeoutMs: {type: 'integer'},
    },
    output: {schema: {type: 'json'}, render: (_args, value) => [{type: 'text', text: JSON.stringify(value)}]},
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      if (args.action === 'hosts') {
        let text = '';
        try { text = await readFile(join(homedir(), '.ssh/config'), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw new Error('SSH_CONFIG_UNREADABLE'); }
        const hosts = parseHosts(text).filter(host => !config.hosts || config.hosts.includes(host));
        return {hosts, includesEnumerated: false};
      }
      if (args.action === 'exec' || args.action === 'write') {
        const policy = ctx.get('sandboxPolicy')?.resolve(exec.agent ? {session: exec.agent.session} : {});
        if (policy?.mode === 'read-only') throw new Error('SSH_READ_ONLY');
        if (policy?.mode !== 'danger-full-access') {
          const approval = ctx.get('approval');
          if (!approval || !exec.agent || await approval.request({agent: exec.agent, toolName: 'ssh', callId: exec.callId, signal: exec.signal, reason: `Run remote ${args.action} on ${args.host}`}) !== 'allowed-once') throw new Error('SSH_APPROVAL_REQUIRED');
        }
      }
      return runRemote(ctx.subprocess, args, exec, config);
    },
    presentCall: args => ({card: 'generic', title: `SSH ${args.action}${args.host ? ` · ${args.host}` : ''}`, kind: args.action === 'exec' ? 'execute' : args.action === 'write' ? 'edit' : 'read'}),
  }));
}
