import type { PagedResponse } from './types.js'

const PAGE_DELAY_MS = 300

export async function paginate<T>(
  fetcher: (page: string | null) => Promise<PagedResponse<T>>,
  onPage?: (pageNum: number) => void,
): Promise<T[]> {
  const all: T[] = []
  let page: string | null = null
  let pageNum = 1

  do {
    onPage?.(pageNum)
    const response = await fetcher(page)
    all.push(...response.data)
    page = response.next_page
    pageNum++

    if (page) {
      await delay(PAGE_DELAY_MS)
    }
  } while (page !== null)

  return all
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
