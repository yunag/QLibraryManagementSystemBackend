export async function paginationHeaders(res, totalCount, page, perPage) {
  res.setHeader('X-Pagination-Current-Page', page)
  res.setHeader('X-Pagination-Total-Count', totalCount)
  res.setHeader('X-Pagination-Page-Count', Math.ceil(totalCount / perPage))
  res.setHeader('X-Pagination-Per-Page', perPage)
}
