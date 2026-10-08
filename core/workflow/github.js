const { createWorkflowStore } = require('./store');

function githubClient({ token = process.env.AI_CORP_GITHUB_TOKEN, repository = process.env.AI_CORP_GITHUB_REPO } = {}) {
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository || '')) return null;
  const [owner, repo] = repository.split('/');
  async function api(method, endpoint, body) {
    const response = await fetch(`https://api.github.com${endpoint}`, { method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ai-corp-local',
        ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`GitHub ${method} ${endpoint}: ${response.status} ${(await response.text()).slice(0, 300)}`);
    return response.status === 204 ? null : response.json();
  }
  return { api, owner, repo, repository };
}

async function synchronizeRun(store, runId, client = githubClient()) {
  if (!client) return { status: 'unconfigured' };
  let run = store.getRun(runId);
  if (!run) throw new Error('İş akışı bulunamadı.');
  const developTask = run.tasks.filter(task => task.kind === 'develop' && task.status === 'completed').at(-1);
  const analyzeTask = run.tasks.filter(task => task.kind === 'analyze' && task.status === 'completed').at(-1);
  const develop = developTask?.output;
  const analyze = analyzeTask?.output;
  if (!develop?.branch) return { status: 'no_branch' };
  const base = process.env.AI_CORP_GITHUB_BASE || 'main';
  const head = `${client.owner}:${develop.branch}`;
  const existing = await client.api('GET', `/repos/${client.repository}/pulls?state=all&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`);
  let pr = existing[0];
  if (!pr) {
    pr = await client.api('POST', `/repos/${client.repository}/pulls`, {
      title: `AI Corp: ${run.idea.slice(0, 80)} [${run.id.slice(0, 8)}]`,
      head: develop.branch, base,
      body: `İş akışı: ${run.id}\n\nResearch ve Develop çıktıları yerel denetim kaydında tutulur. Analyze kapısı tamamlanmadan birleştirme yapılmaz.`,
    });
  }
  store.saveLink(runId, 'pull_request', String(pr.number), pr.html_url, { state: pr.state, branch: develop.branch });
  if (!analyze) return { status: 'waiting_for_analyze', pull_request: pr.html_url };

  for (const [index, finding] of analyze.findings.entries()) {
    if (!finding || !finding.title || !finding.steps) continue;
    const marker = `ai-corp:${runId}:${analyzeTask.id}:${index}`;
    if (run.links.some(link => link.kind === 'issue' && link.key === marker)) continue;
    const listed = await client.api('GET', `/repos/${client.repository}/issues?state=all&per_page=100`);
    let issue = listed.find(item => item.body?.includes(`<!-- ${marker} -->`));
    if (!issue) issue = await client.api('POST', `/repos/${client.repository}/issues`, {
      title: `[${finding.severity || 'medium'}] ${finding.title}`,
      body: `<!-- ${marker} -->\nİş akışı: ${runId}\n\n${finding.description || ''}\n\nYeniden üretme:\n${finding.steps}\n\nBeklenen: ${finding.expected || 'Belirtilmedi'}\nGerçek: ${finding.actual || 'Belirtilmedi'}`,
    });
    store.saveLink(runId, 'issue', marker, issue.html_url, { severity: finding.severity || 'medium', number: issue.number });
  }
  if (analyze.merge_recommendation !== 'ready' || analyze.findings.some(f => ['blocker', 'high'].includes(f.severity))) {
    return { status: 'blocked_by_analyze', pull_request: pr.html_url };
  }
  if (run.stage !== 'github_pending') return { status: run.stage, pull_request: pr.html_url };
  pr = await client.api('GET', `/repos/${client.repository}/pulls/${pr.number}`);
  if (pr.head.sha !== develop.commit) return { status: 'head_changed', pull_request: pr.html_url };
  if (pr.merged) {
    store.completeGitHub(runId, pr.html_url, pr.merge_commit_sha);
    return { status: 'merged', pull_request: pr.html_url };
  }
  if (pr.mergeable !== true) return { status: 'mergeability_pending', pull_request: pr.html_url };
  const checks = await client.api('GET', `/repos/${client.repository}/commits/${pr.head.sha}/check-runs`);
  const statuses = await client.api('GET', `/repos/${client.repository}/commits/${pr.head.sha}/status`);
  const checkRuns = checks.check_runs || [];
  if (!checkRuns.length || checkRuns.some(c => c.status !== 'completed' || c.conclusion !== 'success') ||
    (statuses.statuses?.length && statuses.state !== 'success')) return { status: 'checks_pending', pull_request: pr.html_url };
  const merge = await client.api('PUT', `/repos/${client.repository}/pulls/${pr.number}/merge`,
    { sha: pr.head.sha, merge_method: 'squash' });
  if (!merge.merged) return { status: 'merge_rejected', pull_request: pr.html_url };
  store.completeGitHub(runId, pr.html_url, merge.sha);
  return { status: 'merged', pull_request: pr.html_url };
}

if (require.main === module) {
  const store = createWorkflowStore();
  Promise.all(store.listRuns().filter(run => ['developing', 'analyzing', 'blocked', 'github_pending'].includes(run.stage))
    .map(run => synchronizeRun(store, run.id).then(result => ({ id: run.id, ...result }))))
    .then(results => { console.log(JSON.stringify(results, null, 2)); store.close(); })
    .catch(error => { console.error(error); store.close(); process.exitCode = 1; });
}

module.exports = { githubClient, synchronizeRun };
