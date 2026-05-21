export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseUpn(idToken: string): string {
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')
    );
    return (payload.upn ?? payload.preferred_username ?? payload.email ?? '') as string;
  } catch {
    return '';
  }
}

function formatExpiry(expiresIn: number): string {
  const minutes = Math.floor(expiresIn / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function renderResultPage(
  token: string,
  npmCmd: string,
  idToken: string,
  expiresIn: number
): string {
  const escapedToken = escapeHtml(token);
  const escapedCmd = escapeHtml(npmCmd);
  const upn = escapeHtml(parseUpn(idToken));
  const expiry = escapeHtml(formatExpiry(expiresIn));

  const copyBtn = (label: string, value: string): string =>
    `<button onclick="navigator.clipboard.writeText(this.dataset.v).then(()=>this.textContent='Copied!').catch(()=>{})" data-v="${escapeHtml(value)}">${label}</button>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Azure AD Login — Success</title>
<style>
body { font-family: monospace; max-width: 800px; margin: 40px auto; padding: 0 20px; }
h1,h2 { font-family: sans-serif; }
.meta { font-family: sans-serif; color: #555; margin-bottom: 24px; }
pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; word-break: break-all; white-space: pre-wrap; }
button { margin-top: 8px; padding: 6px 14px; background: #0078d4; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
button:hover { background: #005a9e; }
</style>
</head>
<body>
<h1>Login successful</h1>
<p class="meta">${upn ? `Signed in as <strong>${upn}</strong> &mdash; ` : ''}Token expires in <strong>${expiry}</strong></p>
<h2>Access token</h2>
<pre>${escapedToken}</pre>
${copyBtn('Copy token', token)}
<h2>npm authentication command</h2>
<pre>${escapedCmd}</pre>
${copyBtn('Copy command', npmCmd)}
</body>
</html>`;
}

export function renderErrorPage(message: string): string {
  const escapedMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Azure AD Login — Error</title>
<style>
body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }
.error { color: #c0392b; background: #fdecea; border: 1px solid #f5c6cb; border-radius: 4px; padding: 12px; }
</style>
</head>
<body>
<h1>Authentication error</h1>
<p class="error">${escapedMessage}</p>
</body>
</html>`;
}
