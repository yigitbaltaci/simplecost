import { getSpendByModel } from '@claude-cost/core'
import chalk from 'chalk'
import { Command } from 'commander'
import { formatPct, formatTokens, formatUsd } from '../format/currency.js'
import { makeTable } from '../format/table.js'
import { daysAgo, formatShortDate } from '../format/time.js'

interface ModelsOptions {
  days: string
  json?: boolean
}

export const modelsCommand = new Command('models')
  .description('Breakdown by model')
  .option('-d, --days <number>', 'Number of days', '7')
  .option('--json', 'Output as JSON')
  .action((opts: ModelsOptions) => {
    const days = Number.parseInt(opts.days, 10)
    const from = daysAgo(days)
    const to = new Date()
    const fromTs = Math.floor(from.getTime() / 1000)
    const toTs = Math.floor(to.getTime() / 1000)

    const models = getSpendByModel(fromTs, toTs)

    if (opts.json) {
      console.log(JSON.stringify(models, null, 2))
      return
    }

    console.log()
    console.log(chalk.bold.cyan(`Model Breakdown — last ${days} days`))
    console.log(chalk.gray(`${formatShortDate(from)} — ${formatShortDate(to)}`))
    console.log()
    if (models.length === 0) {
      console.log(chalk.gray('  No API usage in this period.'))
    } else {
      console.log(
        makeTable(
          ['Model', 'Input Tokens', 'Output Tokens', 'Cache Hit %', 'Total Cost'],
          models.map((m) => [
            m.model,
            formatTokens(m.inputTokens),
            formatTokens(m.outputTokens),
            formatPct(m.cacheHitRate),
            formatUsd(m.totalCostUsd),
          ]),
          ['left', 'right', 'right', 'right', 'right'],
        ),
      )
    }
    console.log()
  })
