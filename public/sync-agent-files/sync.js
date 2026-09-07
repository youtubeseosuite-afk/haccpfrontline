#!/usr/bin/env node
// File Path: /sync-agent/sync.js
// Status: NEW FILE
// Description: The Local Sync Agent. Meant to run on a schedule (cron /
// Task Scheduler), not as a background service — each run is a clean,
// short-lived process: scan the configured folder, extract text locally
// from anything new or changed (comparing against a local state file of
// content hashes), and upload only the extracted text to
// /api/sync/upload, never the raw file. Deleted local files are left
// alone — this script only ever adds or updates, never deletes anything
// server-side. Requires Node.js 18+ for the built-in fetch.

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')

const CONFIG_PATH = process.env.SYNC_CONFIG || path.join(__dirname, 'config.json')
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md']

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      `Config file not found at ${CONFIG_PATH}. Copy the example from the README to config.json and fill it in.`
    )
    process.exit(1)
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  if (!config.syncToken || !config.apiUrl || !config.watchFolder) {
    console.error('config.json must include syncToken, apiUrl, and watchFolder.')
    process.exit(1)
  }
  return config
}

function loadState(statePath) {
  if (!fs.existsSync(statePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'))
  } catch {
    console.warn('State file was unreadable, starting fresh.')
    return {}
  }
}

function saveState(statePath, state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

function walk(dir, baseDir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, baseDir, files)
    } else if (SUPPORTED_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      files.push({
        fullPath,
        relativePath: path.relative(baseDir, fullPath).split(path.sep).join('/'),
      })
    }
  }
  return files
}

function hashFile(fullPath) {
  const buffer = fs.readFileSync(fullPath)
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function extractText(fullPath) {
  const ext = path.extname(fullPath).toLowerCase()
  const buffer = fs.readFileSync(fullPath)

  if (ext === '.pdf') {
    const result = await pdfParse(buffer)
    return result.text
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  // .txt / .md
  return buffer.toString('utf8')
}

async function uploadDocument(config, relativePath, title, extractedText) {
  const response = await fetch(`${config.apiUrl}/api/sync/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.syncToken}`,
    },
    body: JSON.stringify({ relativePath, title, extractedText }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Upload failed for ${relativePath}: ${response.status} ${body}`)
  }

  return response.json()
}

async function main() {
  const config = loadConfig()
  const statePath = path.join(__dirname, '.sync-state.json')
  const state = loadState(statePath)

  const files = walk(config.watchFolder, config.watchFolder)
  console.log(`Found ${files.length} supported file(s) in ${config.watchFolder}`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const file of files) {
    const currentHash = hashFile(file.fullPath)

    if (state[file.relativePath] === currentHash) {
      skipped++
      continue
    }

    try {
      const text = await extractText(file.fullPath)
      if (!text.trim()) {
        console.warn(`Skipping ${file.relativePath}: no extractable text`)
        continue
      }

      const title = path.basename(file.fullPath)
      const result = await uploadDocument(config, file.relativePath, title, text)

      state[file.relativePath] = currentHash
      uploaded++
      console.log(`Synced ${file.relativePath} -> version ${result.versionNumber}`)
    } catch (err) {
      failed++
      console.error(`Failed to sync ${file.relativePath}:`, err.message)
    }
  }

  saveState(statePath, state)
  console.log(`Done. Uploaded: ${uploaded}, skipped (unchanged): ${skipped}, failed: ${failed}`)

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('Sync agent crashed:', err)
  process.exitCode = 1
})
