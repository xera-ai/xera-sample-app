export interface PaginationParams {
  offset: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function parsePagination(
  pageStr: unknown,
  limitStr: unknown
): PaginationParams {
  const page = Math.max(1, parseInt(String(pageStr ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(limitStr ?? '20'), 10) || 20))
  const offset = (page - 1) * limit
  return { offset, limit }
}

export function buildMeta(total: number, page: number, limit: number): PaginationMeta {
  const parsedPage = Math.max(1, page)
  const parsedLimit = Math.min(100, Math.max(1, limit))
  return {
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages: Math.ceil(total / parsedLimit),
  }
}
