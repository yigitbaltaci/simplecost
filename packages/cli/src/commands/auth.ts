import { AnthropicAdminClient, setAdminKey } from '@claude-cost/core'
import password from '@inquirer/password'
import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

export const authCommand = new Command('auth')
  .description('Set your Anthropic admin API key')
  .action(async () => {
    let key: string
    try {
      key = await password({ message: 'Admin API key:' })
    } catch {
      process.exit(0)
    }

    key = key.trim()
    if (!key) {
      console.error(chalk.red('No key provided.'))
      process.exit(1)
    }

    const spinner = ora('Validating key…').start()
    try {
      const client = new AnthropicAdminClient(key)
      const org = await client.getMe()
      setAdminKey(key, org.id, org.name)
      spinner.succeed(chalk.green(`✓ Authenticated as ${org.name}`))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      spinner.fail(chalk.red(`Authentication failed: ${message}`))
      process.exit(1)
    }
  })
