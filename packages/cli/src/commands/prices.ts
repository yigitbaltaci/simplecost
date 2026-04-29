import { getModelPricing, loadPricingStore } from '@claude-cost/core'
import chalk from 'chalk'
import { Command } from 'commander'
import path from 'node:path'
import os from 'node:os'

const KNOWN_MODELS = [
  'claude-opus-4-7', 'claude-opus-4-6', 'claude-opus-4-5',
  'claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-sonnet-4',
  'claude-sonnet-3-7', 'claude-sonnet-3-5',
  'claude-haiku-4-5', 'claude-haiku-3-5', 'claude-haiku-3',
]

const PRICING_PATH = path.join(os.homedir(), '.claude-cost', 'pricing.json')

export const pricesCommand = new Command('prices')
  .description('Show current model pricing')
  .action(() => {
    const store = loadPricingStore()

    console.log()
    console.log(chalk.bold.cyan('Model Pricing  ') + chalk.gray('(per million tokens)'))
    console.log(chalk.gray('─'.repeat(50)))
    console.log()

    if (store) {
      const age = Math.floor((Date.now() - new Date(store.updatedAt).getTime()) / 86_400_000)
      console.log(chalk.gray(`  Source: ${PRICING_PATH}`))
      console.log(chalk.gray(`  Updated: ${store.updatedAt.slice(0, 10)} (${age} days ago)`))
    } else {
      console.log(chalk.gray('  Source: hardcoded (verified 2026-04-29)'))
    }

    console.log()
    console.log(
      chalk.gray('  ' + 'Model'.padEnd(36) + 'Input'.padStart(8) + '  ' + 'Output'.padStart(8)),
    )
    console.log(chalk.gray('  ' + '─'.repeat(56)))

    for (const model of KNOWN_MODELS) {
      const p = getModelPricing(model)
      const fromStore = store?.prices?.[model]
      const tag = fromStore ? chalk.green(' ●') : chalk.gray(' ○')
      console.log(
        `  ${chalk.cyan(model.padEnd(36))}` +
        `${('$' + p.inputPerMToken).padStart(8)}  ` +
        `${('$' + p.outputPerMToken).padStart(8)}` +
        tag,
      )
    }

    console.log()
    console.log(chalk.gray(`  ${chalk.green('●')} from ${PRICING_PATH}  ${chalk.gray('○')} hardcoded fallback`))
    console.log()
    console.log(chalk.gray(`  To override, edit: ${PRICING_PATH}`))
    console.log()
  })
