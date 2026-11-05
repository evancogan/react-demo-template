// Agent worker v1.3: starts OpenCode on one issue labeled ready, then reports back on GitHub.
import http from 'node:http';
import {spawn, spawnSync} from 'node:child_process';
import {
  createWriteStream,
  readFileSync,
  appendFileSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';

const HOST = '100.93.209.112';
const PORT = 8787;
const OWNER = 'evancogan';
const NAME = 'react-demo-template';
const REPO = `${OWNER}/${NAME}`;
const REVIEWER = 'evancogan';
const HOME = 'C:\\Agents\\worker';
const CLONE = 'C:\\Repos\\react-demo-template';
const OPENCODE = path.join(
  process.env.APPDATA,
  'npm',
  'node_modules',
  'opencode-ai',
  'bin',
  'opencode.exe'
);
const TIME_LIMIT_MS = 20 * 60 * 1000;
const TOKEN = readFileSync(path.join(HOME, 'token.txt'), 'utf8').trim();

const state = {
  running: false,
  issue: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  log: null,
  pullRequest: null,
  report: null,
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

// Every gh call that reports back goes through here, so failures show up in the window and the log.
function note(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
  if (state.log) {
    try {
      appendFileSync(state.log, line + '\n');
    } catch {}
  }
}
function ghLogged(what, args) {
  const r = gh(args);
  note(`${what}: ${r.ok ? 'ok' : 'FAILED'} ${r.ok ? r.out : r.err}`);
  return r;
}

function prompt(n) {
  return `You are working on GitHub issue #${n}. Do these steps in order.
1. Read the issue with github_issue_read (method "get", owner "${OWNER}", repo "${NAME}", issue_number ${n}). If it isn't labeled "ready", stop.
2. Make only the change the issue asks for. If Constraints gives exact text, copy it exactly. Don't change anything else.
3. To add a line after an existing line, edit with that existing line as the old text, and as the new text that same line followed by the new line. Never put the new line first unless the issue says "before".
4. Read the file again and run git diff. Check the new line is exactly where the issue says. If it isn't, fix it before going on.
5. Run npm run check. If it fails, fix it and run it again, at most 3 tries in total.
6. You are already on branch issue-${n}. Don't switch branches. Run git add, then git commit with a short message ending in (#${n}), then git push -u origin issue-${n}.
7. Open the pull request with github_create_pull_request (owner "${OWNER}", repo "${NAME}", head "issue-${n}", base "main"). For the body, copy .github/pull_request_template.md and fill it in: the first line is "Closes #${n}". Keep both headings. Under "## What changed" write one sentence that describes the diff, including where the line went. Copy every checklist line word for word. Tick only what you verified. For an unticked line, add the reason in parentheses at the end. Never reword a line.
8. Stop. Never merge.`;
}

function checkIssue(n) {
  const r = gh([
    'issue',
    'view',
    String(n),
    '-R',
    REPO,
    '--json',
    'state,labels',
  ]);
  if (!r.ok) return `Couldn't read issue #${n}: ${r.err}`;
  const issue = JSON.parse(r.out);
  if (issue.state !== 'OPEN') return `Issue #${n} isn't open.`;
  if (!issue.labels.some(l => l.name === 'ready'))
    return `Issue #${n} isn't labeled ready.`;
  return null;
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

// Mentions and review requests are what GitHub Mobile pushes to your phone.
function reportOnIssue(n, code) {
  const pr = findPr(n);
  state.pullRequest = pr;
  let body;
  if (pr) {
    body = `@${REVIEWER} Worker finished: opened ${pr}. It's waiting for your review.`;
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
  } else {
    const tail = readLog().trim().split('\n').slice(-15).join('\n');
    body = `@${REVIEWER} Worker stopped without opening a pull request (exit code ${code}). Last lines of its log:\n\n\`\`\`\n${tail}\n\`\`\``;
  }
  const r = ghLogged(`Comment on #${n}`, [
    'issue',
    'comment',
    String(n),
    '-R',
    REPO,
    '--body',
    body,
  ]);
  state.report = r.ok ? 'posted' : `failed: ${r.err}`;
}

function start(n) {
  if (!Number.isInteger(n) || n < 1)
    return [400, {error: 'issue must be a positive whole number'}];
  if (state.running)
    return [409, {error: `Already working on #${state.issue}.`}];
  const problem = checkIssue(n);
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
  if (git(['rev-parse', '--verify', '--quiet', branch]).ok)
    git(['branch', '-D', branch]); // leftover from a closed attempt
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
    issue: n,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    pullRequest: null,
    report: null,
  });
  note(`Started on #${n}, log ${state.log}`);
  // 'close' fires after the process has exited AND its output streams are drained.
  child.on('close', code => {
    clearTimeout(timer);
    Object.assign(state, {
      running: false,
      finishedAt: new Date().toISOString(),
      exitCode: code,
    });
    out.end(() => {
      note(`OpenCode exited with code ${code}`);
      try {
        reportOnIssue(n, code);
      } catch (e) {
        note(`Report crashed: ${e.message}`);
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
  return [200, {...state, logTail: text.split('\n').slice(-30).join('\n')}];
}

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Agent worker',
    version: '1.3.0',
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
  console.log(`Agent worker v1.3 listening on http://${HOST}:${PORT}`)
);
