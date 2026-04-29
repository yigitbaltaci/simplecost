import { readConfig } from '@claude-cost/core'
import chalk from 'chalk'

function logoLines(): string[] {
  const y = chalk.yellowBright
  const c = chalk.cyanBright
  return [`  ${y('>')}${c('◉')}${y(' ')}${c('◉')}${y('<')}`, `   ${y('(^)')}`, `   ${y('/|\\')}`]
}

export function printBanner(version: string): void {
  const logo = logoLines()
  const info = [
    `${chalk.bold.white('simplecost')}  ${chalk.gray(`v${version}`)}  ${chalk.gray('by yigitbaltaci')}`,
    chalk.gray('See where your Anthropic API budget actually goes.'),
  ]

  console.log()
  for (let i = 0; i < Math.max(logo.length, info.length); i++) {
    const left = logo[i] ?? '        '
    const right = info[i] ?? ''
    console.log(`${left}   ${right}`)
  }

  console.log()
  const cmds = ['auth', 'sync', 'report', 'projects', 'models', 'export', 'prices', 'quit']
  console.log(chalk.gray('  Commands:'))
  console.log(`  ${cmds.map((c, i) => chalk.cyan(`${i + 1}.${c}`)).join(chalk.gray('  '))}`)
  console.log()

  const config = readConfig()
  if (!config.adminKey) {
    console.log(
      chalk.red('  ✗ Not authenticated. Run ') +
        chalk.bold.red('auth') +
        chalk.red(' to set your admin API key.'),
    )
    console.log()
  }
}
