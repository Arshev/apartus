#!/usr/bin/env node
// Generate shields.io endpoint JSON badges for backend + frontend coverage.
//
// Reads:
//   backend/coverage/.last_run.json          (SimpleCov)  -> result.line
//   frontend/coverage/coverage-summary.json  (Vitest v8)  -> total.lines.pct
//
// Writes:
//   .github/badges/backend-coverage.json
//   .github/badges/frontend-coverage.json
//
// Zero npm dependencies — only node:fs / node:path. Runs locally and in CI.
// Missing input files produce an "unknown / lightgrey" badge instead of
// failing, so the first CI run before tests exist is still green.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const badgesDir = resolve(repoRoot, '.github/badges')

function colorFor(pct) {
  if (pct == null) return 'lightgrey'
  if (pct < 50) return 'red'
  if (pct < 70) return 'orange'
  if (pct < 80) return 'yellow'
  if (pct < 90) return 'yellowgreen'
  if (pct < 95) return 'green'
  return 'brightgreen'
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err // Anything other than missing file is a real bug — don't swallow.
  }
}

function badge(label, pct) {
  return {
    schemaVersion: 1,
    label,
    message: pct == null ? 'unknown' : `${Math.round(pct)}%`,
    color: colorFor(pct),
  }
}

function writeBadge(name, data) {
  const path = resolve(badgesDir, name)
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
  console.log(`wrote ${path}  ${data.label}: ${data.message}`)
}

// --- backend ---------------------------------------------------------------
// SimpleCov .last_run.json shape: { "result": { "line": 38.22 } }  (v0.18+)
// Older versions used { "result": { "covered_percent": ... } } — handle both.
const beRaw = readJson(resolve(repoRoot, 'backend/coverage/.last_run.json'))
const bePct = beRaw?.result?.line ?? beRaw?.result?.covered_percent ?? null

// --- frontend --------------------------------------------------------------
// Vitest v8 coverage-summary.json shape: { "total": { "lines": { "pct": 0 }, ... } }
const feRaw = readJson(resolve(repoRoot, 'frontend/coverage/coverage-summary.json'))
const fePct = feRaw?.total?.lines?.pct ?? null

mkdirSync(badgesDir, { recursive: true })
writeBadge('backend-coverage.json', badge('backend coverage', bePct))
writeBadge('frontend-coverage.json', badge('frontend coverage', fePct))
