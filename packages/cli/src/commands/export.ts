import fs from 'node:fs'
import { getExportRows } from '@claude-cost/core'
import chalk from 'chalk'
import { Command } from 'commander'
import { daysAgo } from '../format/time.js'

interface ExportOptions {
  days: string
  format: 'csv' | 'json'
  output?: string
}

const CSV_HEADERS = [
  'bucket_start_iso',
  'bucket_end_iso',
  'workspace_id',
  'workspace_name',
  'api_key_id',
  'model',
  'service_tier',
  'uncached_input_tokens',
  'cached_input_tokens',
  'output_tokens',
]

export const exportCommand = new Command('export')
  .description('Export raw usage data')
  .option('-d, --days <number>', 'Number of days', '30')
  .option('-f, --format <format>', 'Output format: csv or json', 'csv')
  .option('-o, --output <file>', 'Output file (default: stdout)')
  .action((opts: ExportOptions) => {
    const days = Number.parseInt(opts.days, 10)
    const fromTs = Math.floor(daysAgo(days).getTime() / 1000)
    const toTs = Math.floor(Date.now() / 1000)

    const rows = getExportRows(fromTs, toTs)

    let output: string
    if (opts.format === 'json') {
      output = JSON.stringify(rows, null, 2)
    } else {
      const csvRows = rows.map((r) =>
        [
          r.bucketStartIso,
          r.bucketEndIso,
          r.workspaceId ?? '',
          r.workspaceName,
          r.apiKeyId ?? '',
          r.model,
          r.serviceTier,
          r.uncachedInputTokens,
          r.cachedInputTokens,
          r.outputTokens,
        ]
          .map(String)
          .join(','),
      )
      output = [CSV_HEADERS.join(','), ...csvRows].join('\n')
    }

    if (opts.output) {
      fs.writeFileSync(opts.output, output, 'utf8')
      console.error(chalk.green(`✓ Exported ${rows.length} rows to ${opts.output}`))
    } else {
      process.stdout.write(`${output}\n`)
    }
  })
