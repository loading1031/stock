/** Convert the trusted Codex summary into a head-specific commit status.
 * Review thread resolution is enforced separately by GitHub branch protection.
 */
export const STATUS_CONTEXT = 'review-complete';
const CODEX_BOT = 'chatgpt-codex-connector[bot]';
const SUMMARY_MARKER = '<!-- codex-pull-request-review-summary -->';

type Status = {state: 'pending' | 'success' | 'failure'; description: string};
export type Comment = {
  id: number;
  user: {login: string; type: string} | null;
  body: string | null;
  created_at: string;
  updated_at: string;
  author_association?: string;
  reactions?: {eyes: number};
};
export type Reaction = {user: {login: string; type: string} | null; content: string};
type Pull = {number: number; state: string; head: {sha: string}; base: {ref: string}};
type Repo = {owner: string; repo: string};
interface Client {
  paginate<T>(route: string, params: Record<string, unknown>): Promise<T[]>;
  rest: {
    pulls: {get(params: Repo & {pull_number: number}): Promise<{data: Pull}>};
    repos: {createCommitStatus(params: Repo & {sha: string; context: string; state: string; description: string; target_url: string}): Promise<unknown>};
  };
}

export function evaluateReview(head: string, comments: Comment[], reactions: Reaction[] = []): Status {
  if (reactions.some(r => r.user?.login === CODEX_BOT && r.user.type === 'Bot' && r.content === 'eyes')) {
    return {state: 'pending', description: 'Codex still has a review running'};
  }
  const summary = comments.filter(c => c.user?.login === CODEX_BOT && c.user.type === 'Bot'
    && c.body?.includes(SUMMARY_MARKER)).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id)[0];
  if (!summary) return {state: 'pending', description: 'Waiting for Codex review on the latest commit'};
  const match = summary.body!.match(/<!-- codex-review-state:v1 (\{[^\n]*\}) -->/);
  if (!match) return {state: 'failure', description: 'Unknown Codex summary format; review gate needs attention'};
  let data: {code_review?: {commit_sha?: string; status?: string}; security_review?: {commit_sha?: string | null; status?: string | null}};
  try { data = JSON.parse(match[1]); }
  catch { return {state: 'failure', description: 'Invalid Codex summary; review gate needs attention'}; }
  if (!data || typeof data !== 'object') return {state: 'failure', description: 'Invalid Codex review state'};
  const review = data.code_review;
  if (!review || review.commit_sha !== head) return {state: 'pending', description: 'Latest commit has not been reviewed by Codex'};
  // A new manual request invalidates a prior completion on the same SHA.
  const requests = comments.filter(c => ['OWNER', 'MEMBER', 'COLLABORATOR'].includes(c.author_association || '')
    && /(?:^|\s)@codex[ \t]+(?:security[ \t]+)?review\b/i.test(c.body || ''));
  for (const request of requests) {
    const securityRequest = /@codex[ \t]+security[ \t]+review\b/i.test(request.body || '');
    const channel = securityRequest ? data.security_review : review;
    const label = securityRequest ? '**Security Review**' : '**Code Review**';
    const row = summary.body!.split('\n').find(line => line.startsWith('|') && line.includes(label));
    const completedAt = row?.includes('**Completed**') && row.match(/datetime="([^"]+)"/);
    const completedTime = completedAt ? Date.parse(completedAt[1]) : NaN;
    const requestedTime = Date.parse(request.updated_at);
    // An unrelated/older completion must never substitute for a requested channel.
    if (!channel || channel.commit_sha !== head || channel.status !== 'completed'
      || !Number.isFinite(completedTime) || !Number.isFinite(requestedTime) || completedTime <= requestedTime) {
      return {state: 'pending', description: 'Waiting for the requested Codex review to complete'};
    }
  }
  if (review.status !== 'completed') {
    return {state: ['failed', 'error', 'cancelled'].includes(review.status || '') ? 'failure' : 'pending',
      description: 'Codex code review is not completed'};
  }
  // If an additional review has been requested, it must finish as well.
  const security = data.security_review;
  if (security?.status && (security.commit_sha !== head || security.status !== 'completed')) {
    return {state: 'pending', description: 'Waiting for the requested Codex security review'};
  }
  return {state: 'success', description: 'Latest commit reviewed; all review threads must also be resolved'};
}

export async function refreshPull(github: Client, repo: Repo, number: number): Promise<Status | null> {
  const {data: pull} = await github.rest.pulls.get({...repo, pull_number: number});
  if (pull.state !== 'open' || !['dev', 'main'].includes(pull.base.ref)) return null;
  const target_url = `https://github.com/${repo.owner}/${repo.repo}/pull/${number}`;
  const post = (status: Status) => github.rest.repos.createCommitStatus({...repo, sha: pull.head.sha,
    context: STATUS_CONTEXT, target_url, ...status});
  await post({state: 'pending', description: 'Checking latest Codex review state'});
  // Commit statuses are shared by SHA, so every open PR using this SHA must pass.
  const siblings = async () => (await github.paginate<Pull>('GET /repos/{owner}/{repo}/pulls',
    {...repo, state: 'open', per_page: 100})).filter(p => p.head.sha === pull.head.sha
      && ['dev', 'main'].includes(p.base.ref));
  const group = await siblings();
  if (!group.some(p => p.number === number)) return null;
  let status: Status = {state: 'success', description: 'Latest commit reviewed; all review threads must also be resolved'};
  for (const sibling of group) {
    const params = {...repo, issue_number: sibling.number, per_page: 100};
    const comments = await github.paginate<Comment>('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', params);
    const reactions = await github.paginate<Reaction>('GET /repos/{owner}/{repo}/issues/{issue_number}/reactions', params);
    // Codex may react to the invoking comment instead of the PR. Use the server's
    // count to avoid unnecessary requests, but fetch when the count is unavailable.
    for (const comment of comments.filter(c => c.reactions?.eyes !== 0)) {
      reactions.push(...await github.paginate<Reaction>('GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions',
        {...repo, comment_id: comment.id, per_page: 100}));
    }
    const result = evaluateReview(pull.head.sha, comments, reactions);
    if (result.state === 'failure' || (result.state === 'pending' && status.state === 'success')) {
      status = {...result, description: `PR #${sibling.number}: ${result.description}`.slice(0, 140)};
    }
  }
  // A new/closed PR or a head/base change invalidates the snapshot instead of posting stale success.
  const signature = (pulls: Pull[]) => pulls.map(p => `${p.number}:${p.head.sha}:${p.base.ref}`).sort().join(',');
  if (signature(group) !== signature(await siblings())) return null;
  await post(status);
  return status;
}
