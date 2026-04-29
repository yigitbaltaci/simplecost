import { getSpendByWorkspace, getWorkspaceDetail } from '@claude-cost/core'
import chalk from 'chalk'
import { Command } from 'commander'
import { formatUsd } from '../format/currency.js'
import { sparkline } from '../format/table.js'
import { daysAgo, formatShortDate, padHour } from '../format/time.js'

interface ProjectsOptions {
  days: string
  json?: boolean
}

export const projectsCommand = new Command('projects')
  .description('Detailed breakdown by workspace')
  .option('-d, --days <number>', 'Number of days', '7')
  .option('--json', 'Output as JSON')
  .action((opts: ProjectsOptions) => {
    const days = Number.parseInt(opts.days, 10)
    const from = daysAgo(days)
    const to = new Date()
    const fromTs = Math.floor(from.getTime() / 1000)
    const toTs = Math.floor(to.getTime() / 1000)

    const workspaces = getSpendByWorkspace(fromTs, toTs)

    if (opts.json) {
      console.log(JSON.stringify(workspaces, null, 2))
      return
    }

    const divider = chalk.gray('─'.repeat(50))
    console.log()
    console.log(chalk.bold.cyan(`Workspace Breakdown — last ${days} days`))
    console.log(chalk.gray(`${formatShortDate(from)} — ${formatShortDate(to)}`))
    console.log()

    if (workspaces.length === 0) {
      console.log(chalk.gray('  No API usage in this period.'))
      console.log()
      return
    }

    for (const ws of workspaces) {
      const detail = getWorkspaceDetail(ws.workspaceId, fromTs, toTs)
      const spark = sparkline(detail.dailyCosts)

      console.log(chalk.bold(`  ${ws.workspaceName}`))
      console.log(divider)
      console.log(
        `  ${'Spend:'.padEnd(20)} ${chalk.bold(formatUsd(ws.totalCostUsd))}  (${ws.pctOfTotal.toFixed(1)}% of total)`,
      )
      console.log(`  ${'Top model:'.padEnd(20)} ${detail.topModel}`)
      console.log(`  ${'Peak hour:'.padEnd(20)} ${padHour(detail.peakHour)}:00 local`)
      console.log(`  ${'Daily trend:'.padEnd(20)} ${spark}`)
      console.log()
    }
  })
