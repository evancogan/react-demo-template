// Agent worker v1.5: OpenCode only edits the files. This service checks the
// change, commits, pushes and opens the pull request. Why each version
// changed: docs/adr/0010-start-the-worker-from-a-small-service.md.
import http from 'node:http';
import {spawn, spawnSync} from 'node:child_process';
import {
  createWriteStream,
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';

const HOST = '100.93.209.112';
const PORT = 8787;
const OWNER = 'evancogan';
const NAME = 'react-demo-template';
const REPO = `${OWNER}/${NAME}`;
const REVIEWER = 'evancogan';
const HOME =
  process.env.WORKER_HOME ??
  (process.platform === 'win32'
    ? 'C:\\Agents\\worker'
    : path.join(os.homedir(), 'agent-worker'));
const CLONE =
  process.env.WORKER_CLONE ??
  (process.platform === 'win32'
    ? 'C:\\Repos\\react-demo-template'
    : path.join(os.homedir(), 'Repos', NAME));
const OPENCODE =
  process.env.OPENCODE_COMMAND ??
  (process.platform === 'win32'
    ? path.join(
        process.env.APPDATA,
        'npm',
        'node_modules',
        'opencode-ai',
        'bin',
        'opencode.exe'
      )
    : 'opencode');
const TIME_LIMIT_MS = 20 * 60 * 1000;
const CHECK_LIMIT_MS = 10 * 60 * 1000;
const TOKEN = readFileSync(path.join(HOME, 'token.txt'), 'utf8').trim();

const state = {
  running: false,
  phase: null, // 'agent' while OpenCode edits, 'checking' while the service checks and publishes
  issue: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  log: null,
  pullRequest: null,
  result: null,
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: CLONE,
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    ok: r.status === 0,
    out: (r.stdout || '').trim(),
    err: (r.stderr || r.error?.message || '').trim(),
  };
}
const git = args => run('git', args);
const gh = args => run('gh', args);
const stripAnsi = text => text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
const lastLines = (text, count) =>
  stripAnsi(text).trim().split('\n').slice(-count).join('\n');

// Every step that reports back goes through here, so failures show up in the window and the log.
function note(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
  if (state.log) {
    try {
      appendFileSync(state.log, line + '\n');
    } catch {
      // The log is a convenience; never let it stop a run.
    }
  }
}
function ghLogged(what, args) {
  const r = gh(args);
  note(`${what}: ${r.ok ? 'ok' : 'FAILED'} ${r.ok ? r.out : r.err}`);
  return r;
}

function prompt(n) {
  return `You are working on GitHub issue #${n}. Your job is only to change the files. After you stop, this service checks your change, commits it, pushes it and opens the pull request, so never run git add, git commit or git push, and never open a pull request.
1. Read the issue with github_issue_read (method "get", owner "${OWNER}", repo "${NAME}", issue_number ${n}). If it isn't labeled "ready", stop.
2. Change only the files listed under "Where". Make only the change the issue asks for. If Constraints gives exact text, copy it exactly. In code, always use straight quotes (" or '), never curly ones.
3. To add a line after an existing line, edit with that existing line as the old text, and as the new text that same line followed by the new line. Never put the new line first unless the issue says "before".
4. Read each file you changed again and run git diff. Check the change is exactly what the issue asks for, in the right place. If it isn't, fix it.
5. Run npm run check. If it fails, do not hand-edit to fix formatting. If Prettier names a file, run npx prettier --write <that file>. If ESLint names a file, run npx eslint --fix <that file>. Then run npm run check again, at most 3 tries in total. The service will run npm run check again after you stop, so leave the tree passing. Warnings are not failures - do not fix warnings in files you did not change.
6. Stop. Reply with one sentence that says what you changed.`;
}

function getIssue(n) {
  const r = gh([
    'issue',
    'view',
    String(n),
    '-R',
    REPO,
    '--json',
    'state,labels,title,body',
  ]);
  return r.ok ? JSON.parse(r.out) : {error: r.err};
}

function checkIssue(issue, n) {
  if (issue.error) return `Couldn't read issue #${n}: ${issue.error}`;
  if (issue.state !== 'OPEN') return `Issue #${n} isn't open.`;
  if (!issue.labels.some(l => l.name === 'ready'))
    return `Issue #${n} isn't labeled ready.`;
  return null;
}

// The paths listed under the issue's "## Where" heading. A path ending in / allows a whole folder.
function whereList(body) {
  const lines = body.replace(/\r/g, '').split('\n');
  const start = lines.findIndex(l => /^##\s+Where\s*$/.test(l));
  if (start < 0) return [];
  const paths = [];
  for (const raw of lines.slice(start + 1)) {
    if (/^##\s/.test(raw)) break;
    const line = raw.replace(/<!--.*?-->/g, '').trim();
    if (!line) continue;
    const quoted = line.match(/`([^`]+)`/);
    const text = quoted ? quoted[1] : line.replace(/^[-*]\s*/, '');
    const first = text.trim().split(/\s+/)[0];
    if (first) paths.push(first.replace(/\\/g, '/').replace(/^\.\//, ''));
  }
  return paths;
}
const inWhere = (file, where) =>
  where.some(w => (w.endsWith('/') ? file.startsWith(w) : file === w));

// What the service can vouch for is ticked; everything else stays unticked with the reason.
const TICKS = [
  ['I read the whole diff', false, "the worker doesn't review its own diff"],
  ['Only files in the issue\'s "Where" changed', true],
  [
    'The summary above matches the diff',
    false,
    'written from the issue title and the changed files; check it against the diff',
  ],
  ['Tests cover the change', false, 'not checked by the worker'],
  ['`npm run check` passes locally', true],
];

// Fills in the pull request template from main, the same copy the description check reads.
function prBody(template, n, summary) {
  return template
    .replace(/\r/g, '')
    .split('\n')
    .map(line => {
      if (/^Closes #\s*$/.test(line.trim())) return `Closes #${n}`;
      if (/^<!--.*-->$/.test(line.trim())) return null;
      if (line.trim() === '## What changed') return `${line}\n\n${summary}`;
      const item = line.match(/^- \[ \] (.*)$/);
      if (!item) return line;
      const rule = TICKS.find(([prefix]) => item[1].startsWith(prefix));
      if (rule && rule[1]) return `- [x] ${item[1]}`;
      return `- [ ] ${item[1]} (${rule ? rule[2] : 'not checked by the worker'})`;
    })
    .filter(line => line !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function npmCheck() {
  return new Promise(resolve => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npm, ['run', 'check'], {
      cwd: CLONE,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let text = '';
    child.stdout.on('data', d => (text += d));
    child.stderr.on('data', d => (text += d));
    const timer = setTimeout(() => child.kill(), CHECK_LIMIT_MS);
    child.on('close', code => {
      clearTimeout(timer);
      if (state.log)
        appendFileSync(state.log, `\n--- npm run check ---\n${text}`);
      resolve({ok: code === 0, tail: lastLines(text, 25)});
    });
    child.on('error', e => {
      clearTimeout(timer);
      resolve({ok: false, tail: e.message});
    });
  });
}

function findPr(n) {
  const r = gh([
    'pr',
    'list',
    '-R',
    REPO,
    '--head',
    `issue-${n}`,
    '--state',
    'open',
    '--json',
    'url',
    '--jq',
    '.[0].url',
  ]);
  return r.ok && r.out ? r.out : null;
}

function comment(n, text) {
  const r = ghLogged(`Comment on #${n}`, [
    'issue',
    'comment',
    String(n),
    '-R',
    REPO,
    '--body',
    `@${REVIEWER} ${text}`,
  ]);
  if (!r.ok) state.result += ` (The comment on the issue failed: ${r.err})`;
}

// Stops without pushing. The work stays committed on the VM's local issue-N branch, and the clone goes back to main.
function stopWithoutPushing(n, reason) {
  git(['switch', 'main']);
  state.result = `Not pushed: ${reason}`;
  note(state.result);
  comment(
    n,
    `Worker stopped without opening a pull request. ${reason}\n\nAny work is on the VM's local branch \`issue-${n}\`.`
  );
}

async function finish(n, code) {
  const branch = `issue-${n}`;
  const issue = getIssue(n);
  if (issue.error)
    return stopWithoutPushing(
      n,
      `Couldn't read the issue again: ${issue.error}`
    );

  // The agent is told to stay on issue-N; if it moved, bring its changes back there.
  const current = git(['branch', '--show-current']).out;
  if (current !== branch) {
    note(
      `The agent left the clone on ${current || 'no branch'}; switching back to ${branch}`
    );
    const back = git(['switch', branch]);
    if (!back.ok)
      return stopWithoutPushing(
        n,
        `Couldn't switch back to ${branch}: ${back.err}`
      );
  }

  git(['add', '-A']);
  const changed = git(['diff', '--cached', '--name-only', 'origin/main'])
    .out.split('\n')
    .filter(Boolean);
  if (!changed.length) {
    const tail = lastLines(readLog(), 15);
    return stopWithoutPushing(
      n,
      `The agent didn't change any files (exit code ${code}). Last lines of its log:\n\n\`\`\`\n${tail}\n\`\`\``
    );
  }

  // Commit now, so the work is kept whatever happens next and the clone ends up clean.
  if (!git(['diff', '--cached', '--quiet']).ok) {
    const c = git(['commit', '-m', `${issue.title} (#${n})`]);
    if (!c.ok) return stopWithoutPushing(n, `git commit failed: ${c.err}`);
  }

  const where = whereList(issue.body);
  const outside = changed.filter(f => !inWhere(f, where));
  if (outside.length) {
    return stopWithoutPushing(
      n,
      where.length
        ? `The agent changed files outside the issue's Where: ${outside.join(', ')}.`
        : "The issue's Where lists no files, so no change can be checked against it."
    );
  }

  note('Running npm run check');
  const check = await npmCheck();
  note(`npm run check: ${check.ok ? 'passed' : 'FAILED'}`);
  if (!check.ok) {
    return stopWithoutPushing(
      n,
      `npm run check failed after the agent's change. Last lines:\n\n\`\`\`\n${check.tail}\n\`\`\``
    );
  }

  const push = git(['push', '-u', 'origin', branch]);
  note(`Push: ${push.ok ? 'ok' : 'FAILED ' + push.err}`);
  if (!push.ok) return stopWithoutPushing(n, `git push failed: ${push.err}`);

  const template = git([
    'show',
    'origin/main:.github/pull_request_template.md',
  ]).out;
  const files = changed.map(f => `\`${f}\``).join(', ');
  const summary = `Changes ${files} for #${n}: ${issue.title.replace(/\.$/, '')}.`;
  const bodyFile = path.join(HOME, 'logs', `issue-${n}-pr.md`);
  writeFileSync(bodyFile, prBody(template, n, summary));

  // If the agent opened a pull request anyway, use it, with the service's description.
  let pr = findPr(n);
  if (pr) {
    ghLogged("Replace the agent's description", [
      'api',
      '-X',
      'PATCH',
      `repos/${REPO}/pulls/${pr.split('/').pop()}`,
      '-F',
      `body=@${bodyFile}`,
      '--jq',
      '.html_url',
    ]);
  } else {
    const r = ghLogged('Open pull request', [
      'api',
      '-X',
      'POST',
      `repos/${REPO}/pulls`,
      '-f',
      `title=${issue.title}`,
      '-f',
      `head=${branch}`,
      '-f',
      'base=main',
      '-F',
      `body=@${bodyFile}`,
      '--jq',
      '.html_url',
    ]);
    if (!r.ok)
      return stopWithoutPushing(n, `Opening the pull request failed: ${r.err}`);
    pr = r.out;
  }
  state.pullRequest = pr;

  ghLogged('Request review', [
    'api',
    '-X',
    'POST',
    `repos/${REPO}/pulls/${pr.split('/').pop()}/requested_reviewers`,
    '-f',
    `reviewers[]=${REVIEWER}`,
    '--jq',
    '.html_url',
  ]);
  git(['switch', 'main']);
  state.result = `Opened ${pr}`;
  comment(n, `Worker finished: opened ${pr}. It's waiting for your review.`);
}

function readLog() {
  try {
    return state.log && existsSync(state.log)
      ? readFileSync(state.log, 'utf8')
      : '';
  } catch {
    return '';
  }
}

function start(n) {
  if (!Number.isInteger(n) || n < 1)
    return [400, {error: 'issue must be a positive whole number'}];
  if (state.running)
    return [409, {error: `Already working on #${state.issue}.`}];
  const problem = checkIssue(getIssue(n), n);
  if (problem) return [409, {error: problem}];
  if (git(['status', '--porcelain']).out)
    return [
      409,
      {error: 'The VM clone has uncommitted changes. Clean it up first.'},
    ];
  for (const args of [
    ['switch', 'main'],
    ['fetch', '--prune'],
  ]) {
    const r = git(args);
    if (!r.ok) return [500, {error: `git ${args.join(' ')} failed: ${r.err}`}];
  }
  // main only ever changes on GitHub, through a reviewed pull request. Local commits on it are strays:
  // keep them on a backup branch, then match GitHub. The clean-tree check above means nothing uncommitted is lost.
  const ahead = git(['rev-list', '--count', 'origin/main..main']).out;
  if (ahead !== '0') {
    const backup = `main-backup-${Date.now()}`;
    git(['branch', backup, 'main']);
    note(
      `Local main had ${ahead} commit(s) not on GitHub; saved them to ${backup}`
    );
  }
  const reset = git(['reset', '--hard', 'origin/main']);
  if (!reset.ok)
    return [500, {error: `git reset to origin/main failed: ${reset.err}`}];
  const branch = `issue-${n}`;
  if (git(['ls-remote', '--exit-code', '--heads', 'origin', branch]).ok)
    return [
      409,
      {
        error: `Branch ${branch} already exists on GitHub. Close its pull request and delete the branch first.`,
      },
    ];
  // A local issue-N from an earlier attempt is kept under a new name if it has work on it.
  if (git(['rev-parse', '--verify', '--quiet', branch]).ok) {
    const work = git(['rev-list', '--count', `main..${branch}`]).out;
    if (work === '0') {
      git(['branch', '-D', branch]);
    } else {
      const old = `${branch}-attempt-${Date.now()}`;
      git(['branch', '-m', branch, old]);
      note(`Kept the earlier local ${branch} as ${old}`);
    }
  }
  // The service makes the branch, so the agent never works on main.
  const sw = git(['switch', '-c', branch]);
  if (!sw.ok)
    return [500, {error: `git switch -c ${branch} failed: ${sw.err}`}];

  state.log = path.join(HOME, 'logs', `issue-${n}-${Date.now()}.log`);
  const out = createWriteStream(state.log);
  const child = spawn(OPENCODE, ['run', '--auto', prompt(n)], {
    cwd: CLONE,
    env: process.env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // end: false on both, so whichever stream finishes first can't close the log under the other one.
  child.stdout.pipe(out, {end: false});
  child.stderr.pipe(out, {end: false});
  const timer = setTimeout(() => child.kill(), TIME_LIMIT_MS);
  Object.assign(state, {
    running: true,
    phase: 'agent',
    issue: n,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    pullRequest: null,
    result: null,
  });
  note(`Started on #${n}, log ${state.log}`);
  // 'close' fires after the process has exited AND its output streams are drained.
  child.on('close', code => {
    clearTimeout(timer);
    Object.assign(state, {phase: 'checking', exitCode: code});
    out.end(async () => {
      note(`OpenCode exited with code ${code}`);
      try {
        await finish(n, code);
      } catch (e) {
        state.result = `The service crashed while finishing: ${e.message}`;
        note(state.result);
      } finally {
        Object.assign(state, {
          running: false,
          phase: null,
          finishedAt: new Date().toISOString(),
        });
      }
    });
  });
  child.on('error', e => note(`Couldn't start OpenCode: ${e.message}`));
  return [
    200,
    {
      started: true,
      issue: n,
      message: `Started on #${n}. This chat won't hear when it finishes. Check GitHub for the pull request.`,
    },
  ];
}

function status() {
  const text = readLog();
  return [200, {...state, logTail: lastLines(text, 30)}];
}

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Agent worker',
    version: '1.5.0',
    description:
      'Starts the coding agent in the agent VM on one GitHub issue labeled ready, and reports how it went.',
  },
  servers: [{url: `http://${HOST}:${PORT}`}],
  security: [{bearer: []}],
  components: {securitySchemes: {bearer: {type: 'http', scheme: 'bearer'}}},
  paths: {
    '/start': {
      post: {
        operationId: 'start_worker',
        summary: 'Start the worker on a GitHub issue that is labeled ready',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['issue'],
                properties: {
                  issue: {
                    type: 'integer',
                    description: `Issue number in ${REPO}`,
                  },
                },
              },
            },
          },
        },
        responses: {200: {description: 'Started'}},
      },
    },
    '/status': {
      get: {
        operationId: 'worker_status',
        summary:
          'Show whether the worker is running, and the result of its last run',
        responses: {200: {description: 'Status'}},
      },
    },
  },
};

function authorized(req) {
  const got = Buffer.from(req.headers.authorization || '');
  const want = Buffer.from('Bearer ' + TOKEN);
  return got.length === want.length && timingSafeEqual(got, want);
}

const server = http.createServer((req, res) => {
  const send = (code, body) => {
    res.writeHead(code, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && req.url === '/openapi.json')
    return send(200, spec);
  if (!authorized(req)) return send(401, {error: 'unauthorized'});
  if (req.method === 'GET' && req.url === '/status') return send(...status());
  if (req.method === 'POST' && req.url === '/start') {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 10000) req.destroy();
    });
    req.on('end', () => {
      let n;
      try {
        n = JSON.parse(body).issue;
      } catch {
        return send(400, {error: 'send JSON like {"issue": 58}'});
      }
      send(...start(n));
    });
    return;
  }
  send(404, {error: 'not found'});
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE')
    console.error(
      `Port ${PORT} is taken: the old worker is still running. Close its window (or Ctrl+C in it), then start this again.`
    );
  else console.error(e);
  process.exit(1);
});
server.listen(PORT, HOST, () =>
  console.log(`Agent worker v1.5 listening on http://${HOST}:${PORT}`)
);
