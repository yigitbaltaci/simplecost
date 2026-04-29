import { Command } from 'commander'
import { printBanner } from './banner.js'
import { authCommand } from './commands/auth.js'
import { exportCommand } from './commands/export.js'
import { pricesCommand } from './commands/prices.js'
import { modelsCommand } from './commands/models.js'
import { projectsCommand } from './commands/projects.js'
import { reportCommand } from './commands/report.js'
import { syncCommand } from './commands/sync.js'
import { startRepl } from './repl.js'

const VERSION = '0.0.1'

const program = new Command()

program
  .name('simplecost')
  .description('See where your Anthropic API budget actually goes.')
  .version(VERSION)
  .addHelpCommand(false)
  .helpOption('-h, --help', 'Show help')

program.addCommand(authCommand)
program.addCommand(syncCommand)
program.addCommand(reportCommand)
program.addCommand(projectsCommand)
program.addCommand(modelsCommand)
program.addCommand(exportCommand)
program.addCommand(pricesCommand)

// No args + not inside REPL → show banner and start interactive mode
if (process.argv.length === 2 && !process.env.SIMPLECOST_REPL) {
  printBanner(VERSION)
  startRepl()
} else {
  program.parse()
}
