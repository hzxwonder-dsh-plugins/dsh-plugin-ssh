import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseHosts, validateTarget, runRemote, apply} from '../index.js';

test('host discovery excludes patterns, negations and option injection', () => {
  assert.deepEqual(parseHosts('Host prod staging\nHost * !private\nHost prod # comment'), ['prod', 'staging']);
  for (const host of ['-oProxyCommand=x', 'host;id', 'host\nother', 'user@host x']) assert.throws(() => validateTarget(host));
  assert.equal(validateTarget('user@server'), 'user@server');
});

test('remote protocol checks revisions, traversal, symlinks, UTF-8 and timeout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ssh-protocol-'));
  const call = input => {
    const result = spawnSync('python3', [fileURLToPath(new URL('../remote.py', import.meta.url))], {input: JSON.stringify({root, timeout: 1, ...input}), encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  try {
    assert.equal(call({action: 'probe'}).ok, true);
    assert.equal(call({action: 'write', path: '.dsh-ssh-write.lock', content: 'x', baseRevision: 'missing'}).error, 'SSH_RESERVED_PATH');
    assert.equal(call({action: 'write', path: 'a.txt', content: 'hello', baseRevision: 'missing'}).ok, true);
    const first = call({action: 'read', path: 'a.txt'}).result;
    assert.equal(first.content, 'hello');
    assert.equal(call({action: 'write', path: 'a.txt', content: 'new', baseRevision: 'missing'}).error, 'SSH_REVISION_CONFLICT');
    assert.equal(call({action: 'write', path: 'a.txt', content: 'new', baseRevision: first.revision}).ok, true);
    assert.equal(call({action: 'read', path: '../outside'}).error, 'SSH_PATH_OUTSIDE_ROOT');
    await symlink(join(root, 'a.txt'), join(root, 'link'));
    assert.equal(call({action: 'read', path: 'link'}).error, 'SSH_SYMLINK_DENIED');
    await writeFile(join(root, 'large'), 'x'.repeat(65537));
    assert.equal(call({action: 'read', path: 'large'}).ok, false);
    const command = call({action: 'exec', command: 'printf hello; exit 7'}).result;
    assert.equal(command.exitCode, 7);
    assert.equal(command.stdout.text, 'hello');
    assert.equal(call({action: 'exec', command: 'sleep 5', timeout: 0.1}).result.timedOut, true);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('DSH subprocess contract uses argv, batch stdin and teardown', async () => {
  let spec, terminated = false;
  const subprocess = {
    resolveExecutable: async () => '/usr/bin/ssh',
    spawn(input) { spec = input; return {
      done: Promise.resolve({exitCode: 0}), collected: {stdout: {readFrom: () => ({text: '{"ok":true,"result":{"root":"/tmp"}}', lossy: false})}},
      terminate() { terminated = true; }, waitForExit: async () => true,
    }; },
  };
  const result = await runRemote(subprocess, {action: 'probe', host: 'test', root: '/tmp'}, {signal: new AbortController().signal});
  assert.equal(result.root, '/tmp');
  assert(spec.argv.includes('StrictHostKeyChecking=yes'));
  assert.equal(JSON.parse(spec.stdio.stdin.data).root, '/tmp');
  assert(terminated);
});

test('tool refuses mutating operations with no approval service', async () => {
  let tool;
  apply({tools: {register(value) { tool = value; }}, get() { return undefined; }});
  await assert.rejects(tool.execute({action: 'exec', host: 'test', root: '/tmp', command: 'true'}, {signal: new AbortController().signal}), /SSH_APPROVAL_REQUIRED/);
});
