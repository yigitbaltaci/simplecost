import { RateLimitError, getTotals, sync } from '@claude-cost/core'
import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import { formatUsd } from '../format/currency.js'
import { daysAgo } from '../format/time.js'

export const syncCommand = new Command('sync')
  .description('Sync usage and cost data from Anthropic API')
  .option('-d, --days <number>', 'Number of days to sync', '7')
  .option('--mock', 'Use mock fixture data (no API key required)')
  .action(async (opts: { days: string; mock?: boolean }) => {
    const days = Number.parseInt(opts.days, 10)
    if (Number.isNaN(days) || days < 1) {
      console.error(chalk.red('--days must be a positive integer'))
      process.exit(1)
    }

    if (opts.mock) {
      process.env.CLAUDE_COST_MOCK = '1'
    } else {
      process.env.CLAUDE_COST_MOCK = undefined
    }

    if (opts.mock) {
      console.log(chalk.yellow('⚠  Mock mode — using fixture data, no API calls made'))
    }

    // Skip ESC-to-cancel inside the REPL — its readline owns stdin and
    // toggling raw mode under it leaves the parent's prompt corrupted.
    const inRepl = process.env.SIMPLECOST_REPL === '1'
    const allowRawInput = process.stdin.isTTY && !inRepl
    const spinnerText = allowRawInput
      ? { text: 'Syncing…', suffixText: chalk.gray('(ESC to cancel)') }
      : { text: 'Syncing…' }
    const spinner = ora(spinnerText).start()

    if (allowRawInput) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on('data', (buf: Buffer) => {
        if (buf[0] === 0x1b) {
          process.stdin.setRawMode(false)
          spinner.fail(chalk.yellow('Sync cancelled.'))
          process.exit(0)
        }
      })
    }

    try {
      const result = await sync({
        from: daysAgo(days),
        to: new Date(),
        onProgress: (msg) => {
          spinner.text = msg
        },
      })

      if (allowRawInput) process.stdin.setRawMode(false)
      spinner.stop()
      console.log(
        chalk.green(`✓ Synced ${result.usageBucketsAdded.toLocaleString()} usage buckets`),
      )
      console.log(chalk.green(`✓ Synced ${result.costBucketsAdded.toLocaleString()} cost buckets`))
      console.log(chalk.green(`✓ Synced ${result.workspacesAdded} workspaces`))

      const fromTs = Math.floor(daysAgo(days).getTime() / 1000)
      const toTs = Math.floor(Date.now() / 1000)
      const totals = getTotals(fromTs, toTs)
      console.log(`\nTotal spend last ${days}d: ${chalk.bold(formatUsd(totals.totalCostUsd))}`)
    } catch (err) {
      if (allowRawInput) process.stdin.setRawMode(false)
      if (err instanceof RateLimitError) {
        spinner.fail(
          chalk.red(`Rate limited by Anthropic API. Wait ${err.retryAfterSec}s and try again.`),
        )
      } else {
        spinner.fail(chalk.red(err instanceof Error ? err.message : String(err)))
      }
      process.exit(1)
    }
  })
