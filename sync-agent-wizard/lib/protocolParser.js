// File Path: /sync-agent-wizard/lib/protocolParser.js
// Status: NEW FILE
// Production Ready: Draft — logic is straightforward and defensively
// written, but genuinely untested against a real qms-sync:// launch on
// Windows. Verify argv actually contains the URL in the shape assumed
// here before relying on it.
// Description: Parses a qms-sync://activate?token=...&apiUrl=... URL.
// Windows hands this to the app as a plain command-line argument (via
// Electron's 'second-instance' event once the app is registered as the
// protocol's default handler) — this function is pure string parsing,
// not tied to any Electron API, so it's easy to unit test on its own.

function parseActivationUrl(rawUrl) {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { error: `Not a valid URL: ${rawUrl}` }
  }

  if (parsed.protocol !== 'qms-sync:') {
    return { error: `Unexpected protocol: ${parsed.protocol}` }
  }

  // "qms-sync://activate?..." can parse "activate" into either .hostname
  // or .pathname depending on how the OS/shell quoted the argument —
  // check both so this doesn't silently break on a minor formatting
  // difference.
  const action = parsed.hostname || parsed.pathname.replace(/^\/+/, '')
  if (action !== 'activate') {
    return { error: `Unknown action: ${action}` }
  }

  const token = parsed.searchParams.get('token')
  const apiUrl = parsed.searchParams.get('apiUrl')

  if (!token) {
    return { error: 'Activation link is missing a token' }
  }
  if (!apiUrl) {
    return { error: 'Activation link is missing an apiUrl' }
  }

  return { token, apiUrl }
}

// Finds the qms-sync:// URL among the raw argv Electron gives us (either
// from the initial launch or from a 'second-instance' event while the
// wizard was already running).
function findActivationUrl(argv) {
  return argv.find((arg) => arg.startsWith('qms-sync://')) || null
}

module.exports = { parseActivationUrl, findActivationUrl }
