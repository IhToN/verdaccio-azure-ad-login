export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderResultPage(token: string, npmCmd: string): string {
  const escapedToken = escapeHtml(token);
  const escapedCmd = escapeHtml(npmCmd);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Azure AD Login — Success</title>
<style>
body { font-family: monospace; max-width: 800px; margin: 40px auto; padding: 0 20px; }
h1,h2 { font-family: sans-serif; }
pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; word-break: break-all; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>Login successful</h1>
<h2>Access token</h2>
<pre>${escapedToken}</pre>
<h2>npm authentication command</h2>
<pre>${escapedCmd}</pre>
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
