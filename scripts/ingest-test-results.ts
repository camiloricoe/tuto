#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { argv, env, exit } from 'node:process'

type Args = {
  source: 'cron' | 'deploy' | 'manual' | 'pr' | 'local'
  status: 'passed' | 'failed' | 'partial' | 'running'
  duration_ms: number
  unit_total: number
  unit_passed: number
  unit_failed: number
  e2e_total: number
  e2e_passed: number
  e2e_failed: number
  e2e_skipped: number
}

function parsePlaywrightJson(path: string) {
  if (!existsSync(path)) return { total: 0, passed: 0, failed: 0, skipped: 0 }
  const json = JSON.parse(readFileSync(path, 'utf8')) as {
    suites?: Array<{ suites?: Array<unknown>; specs?: Array<{ tests: Array<{ results: Array<{ status: string }> }> }> }>
    stats?: { expected: number; unexpected: number; skipped: number; flaky: number }
  }
  if (json.stats) {
    return {
      total: json.stats.expected + json.stats.unexpected + json.stats.skipped + json.stats.flaky,
      passed: json.stats.expected,
      failed: json.stats.unexpected,
      skipped: json.stats.skipped,
    }
  }
  return { total: 0, passed: 0, failed: 0, skipped: 0 }
}

function parseVitestJson(path: string) {
  if (!existsSync(path)) return { total: 0, passed: 0, failed: 0 }
  const json = JSON.parse(readFileSync(path, 'utf8')) as {
    numTotalTests?: number
    numPassedTests?: number
    numFailedTests?: number
  }
  return {
    total: json.numTotalTests ?? 0,
    passed: json.numPassedTests ?? 0,
    failed: json.numFailedTests ?? 0,
  }
}

async function main() {
  const flags = argv.slice(2).reduce<Record<string, string>>((acc, a, i, arr) => {
    if (a.startsWith('--')) acc[a.slice(2)] = arr[i + 1] ?? ''
    return acc
  }, {})

  const target = flags.target ?? env.HEALTH_TARGET ?? 'https://tuto-flame.vercel.app'
  const token = flags.token ?? env.HEALTH_INGEST_TOKEN
  if (!token) {
    console.error('HEALTH_INGEST_TOKEN missing')
    exit(2)
  }

  const e2e = parsePlaywrightJson(flags['e2e-json'] ?? './playwright-report/results.json')
  const unit = parseVitestJson(flags['unit-json'] ?? './vitest-results.json')

  const failed = unit.failed + e2e.failed
  const status: Args['status'] =
    failed === 0 ? 'passed' : (unit.passed + e2e.passed > 0 ? 'partial' : 'failed')

  const payload: Args & {
    source: Args['source']
    branch?: string
    commit_sha?: string
    trigger_actor?: string
    environment: string
  } = {
    source: ((flags.source as Args['source']) ?? (env.GITHUB_EVENT_NAME === 'schedule' ? 'cron' : env.CI ? 'pr' : 'local')) as Args['source'],
    status,
    duration_ms: parseInt(flags['duration-ms'] ?? '0', 10),
    unit_total: unit.total,
    unit_passed: unit.passed,
    unit_failed: unit.failed,
    e2e_total: e2e.total,
    e2e_passed: e2e.passed,
    e2e_failed: e2e.failed,
    e2e_skipped: e2e.skipped,
    branch: flags.branch ?? env.GITHUB_REF_NAME,
    commit_sha: flags.commit ?? env.GITHUB_SHA,
    trigger_actor: flags.actor ?? env.GITHUB_ACTOR,
    environment: flags.env ?? 'production',
  }

  const res = await fetch(`${target}/api/health/test-run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tuto-health-token': token,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    console.error(`Ingest failed: ${res.status} ${await res.text()}`)
    exit(1)
  }
  console.log(`Ingest OK: ${await res.text()}`)
}

main().catch((err) => {
  console.error(err)
  exit(1)
})
