import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import chalk from 'chalk'

const COMMANDS = ['sync', 'report', 'projects', 'models', 'export', 'prices', 'auth', 'help', 'quit']

const LINE = chalk.gray('─'.repeat(50))

function completer(line: string): [string[], string] {
  const hits = COMMANDS.filter((c) => c.startsWith(line))
  return [hits.length ? hits : COMMANDS, line]
}

function showPrompt(): void {
  process.stdout.write(`${LINE}\n${chalk.cyan('❯ ')}`)
}

export function startRepl(): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    completer,
  })

  showPrompt()

  rl.on('line', (raw) => {
    const input = raw.trim()

    process.stdout.write(`${LINE}\n`)

    if (!input) {
      showPrompt()
      return
    }

    if (input === 'q' || input === 'quit' || input === 'exit') {
      rl.close()
      return
    }

    if (input === 'help') {
      console.log()
      console.log(chalk.gray('  sync      --days N  --mock'))
      console.log(chalk.gray('  report    --days N  --json'))
      console.log(chalk.gray('  projects  --days N'))
      console.log(chalk.gray('  models    --days N'))
      console.log(chalk.gray('  export    --format csv|json  --output FILE'))
      console.log(chalk.gray('  auth'))
      console.log(chalk.gray('  quit'))
      console.log()
      showPrompt()
      return
    }

    const entryPoint = process.argv[1]
    if (!entryPoint) {
      console.error(
        chalk.red('Cannot locate entry script — running outside a normal node invocation?'),
      )
      showPrompt()
      return
    }
    const args = input.split(/\s+/)
    spawnSync(process.execPath, [entryPoint, ...args], {
      stdio: 'inherit',
      env: { ...process.env, SIMPLECOST_REPL: '1' },
    })

    console.log()
    showPrompt()
  })

  rl.on('close', () => {
    console.log()
    process.exit(0)
  })
}
