import { describe, expect, it, vi } from 'vitest'
import { paginate } from './pagination.js'

describe('paginate', () => {
  it('returns all items from a single page', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({
      data: [1, 2, 3],
      has_more: false,
      next_page: null,
    })

    const result = await paginate(fetcher)
    expect(result).toEqual([1, 2, 3])
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(null)
  })

  it('follows next_page cursor across multiple pages', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], has_more: true, next_page: 'page2' })
      .mockResolvedValueOnce({ data: [3, 4], has_more: true, next_page: 'page3' })
      .mockResolvedValueOnce({ data: [5], has_more: false, next_page: null })

    const result = await paginate(fetcher)
    expect(result).toEqual([1, 2, 3, 4, 5])
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(fetcher).toHaveBeenNthCalledWith(1, null)
    expect(fetcher).toHaveBeenNthCalledWith(2, 'page2')
    expect(fetcher).toHaveBeenNthCalledWith(3, 'page3')
  })

  it('returns empty array when first page is empty', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({
      data: [],
      has_more: false,
      next_page: null,
    })

    const result = await paginate(fetcher)
    expect(result).toEqual([])
  })
})
