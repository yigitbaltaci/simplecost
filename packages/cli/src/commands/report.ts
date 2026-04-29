import { getSpendByWorkspace, getTotals } from '@claude-cost/core'
import chalk from 'chalk'
import { Command } from 'commander'
import { formatPct, formatTokens, formatUsd } from '../format/currency.js'
import { makeTable } from '../format/table.js'
import { daysAgo, formatShortDate } from '../format/time.js'

interface ReportOptions {
  days: string
  from?: string
  to?: string
  json?: boolean
}

export const reportCommand = new Command('report')
  .description('Show cost report summary')
  .option('-d, --days <number>', 'Number of days to include', '7')
  .option('--from <date>', 'Start date (ISO 8601)')
  .option('--to <date>', 'End date (ISO 8601)')
  .option('--json', 'Output as JSON')
  .action((opts: ReportOptions) => {
    const from = opts.from ? new Date(opts.from) : daysAgo(Number.parseInt(opts.days, 10))
    const to = opts.to ? new Date(opts.to) : new Date()
    const fromTs = Math.floor(from.getTime() / 1000)
    const toTs = Math.floor(to.getTime() / 1000)

    const totals = getTotals(fromTs, toTs)
    const workspaces = getSpendByWorkspace(fromTs, toTs)

    if (opts.json) {
      console.log(JSON.stringify({ totals, workspaces }, null, 2))
      return
    }

    const divider = chalk.gray('─'.repeat(50))

    console.log()
    console.log(chalk.bold.cyan('Anthropic API Cost Report'))
    console.log(divider)
    console.log(`${'Range:'.padEnd(18)} ${formatShortDate(from)} — ${formatShortDate(to)}`)
    console.log(`${'Total spend:'.padEnd(18)} ${chalk.bold(formatUsd(totals.totalCostUsd))}`)
    console.log(
      `${'Total tokens:'.padEnd(18)} ${formatTokens(totals.totalInputTokens)} input / ${formatTokens(totals.totalOutputTokens)} output`,
    )
    console.log(`${'Cache hit rate:'.padEnd(18)} ${formatPct(totals.cacheHitRate)}`)
    console.log(`${'Workspaces:'.padEnd(18)} ${totals.activeWorkspaceCount} active`)
    console.log(`${'Models:'.padEnd(18)} ${totals.models.join(', ')}`)

    if (workspaces.length > 0) {
      console.log()
      console.log(chalk.bold('Top spending workspaces:'))
      console.log(
        makeTable(
          ['Workspace', 'Spend', '% Total'],
          workspaces.map((w) => [
            w.workspaceName,
            formatUsd(w.totalCostUsd),
            `${w.pctOfTotal.toFixed(1)}%`,
          ]),
          ['left', 'right', 'right'],
        ),
      )
    }
    console.log()
  })
