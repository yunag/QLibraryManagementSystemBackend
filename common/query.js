export function addWhereClause(baseQuery, conditions) {
  if (!conditions || conditions.length === 0) {
    return baseQuery
  }

  const whereClause = ` WHERE ${conditions.join(' AND ')}`
  return baseQuery + whereClause
}

/**
 * @param {{filter: string, value: any}[]} props
 * @returns {{ filters: string[], values: any[]}} result object
 */
export function getFilters(props) {
  const filters = []
  const values = []

  props.map(({ filter, value }) => {
    if (value) {
      filters.push(filter)
      values.push(value)
    }
  })

  return { filters: filters, values: values }
}

/**
 * @param {string | undefined} api Sort api query
 * @param {Object<string, string>} mapToDbField Mapper from api name to db column
 */
export function constructOrderBy(api, mapToDbField) {
  if (!api) {
    return ''
  }

  const order = api.split('-')

  return `ORDER BY ${mapToDbField[order[0]] || order[0]} ${order[1] || 'desc'}`
}
