import Table from 'cli-table3'

export function makeTable(
  head: string[],
  rows: string[][],
  colAligns?: Array<'left' | 'right' | 'center'>,
): string {
  const table = new Table({
    head,
    colAligns: colAligns ?? head.map(() => 'left'),
    style: { head: ['cyan'] },
  })
  for (const row of rows) {
    table.push(row)
  }
  return table.toString()
}

// Unicode block sparkline from an array of numbers
const BLOCKS = '▁▂▃▄▅▆▇█'

export function sparkline(values: number[]): string {
  const max = Math.max(...values, 1)
  return values
    .map((v) => {
      const idx = Math.min(Math.floor((v / max) * (BLOCKS.length - 1)), BLOCKS.length - 1)
      return BLOCKS[idx] ?? '▁'
    })
    .join('')
}
