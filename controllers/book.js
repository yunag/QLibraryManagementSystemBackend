import { handleError } from '../common/error.js'
import { paginationHeaders } from '../common/pagination.js'
import knex from '../database/database.js'

function notExistsError(res, id) {
  return res.status(404).json({
    error: `Book with id=${id} does not exists`
  })
}

/**
 * @param props {{
 *  includeAuthors: boolean,
 *  includeCategories: boolean
 * }}
 */
function baseQuery(props) {
  const { includeAuthors = false, includeCategories = false } = props

  const query = knex({ b: 'book' }).select(
    { id: 'book_id' },
    'title',
    'description',
    'cover_url',
    { rating: 'avg_rating' },
    'rate_count',
    knex.raw("date_format(publication_date, '%d-%m-%Y') AS publication_date"),
    'copies_owned'
  )

  const authorsQuery = `
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', a.author_id,
          'first_name', a.first_name,
          'last_name', a.last_name
        )
      ) FROM author AS a
      INNER JOIN book_author ba ON ba.author_id = a.author_id
      WHERE ba.book_id = b.book_id
      ORDER BY a.first_name
      ), JSON_ARRAY()
    ) AS authors
    `
  const categoriesQuery = `
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', c.category_id,
          'name', c.name
        )
      ) FROM category AS c
      INNER JOIN book_category bc ON bc.category_id = c.category_id
      WHERE bc.book_id = b.book_id
      ORDER BY c.name
      ), JSON_ARRAY()
    ) AS categories
    `
  if (includeAuthors) {
    query.select(knex.raw(authorsQuery))
  }

  if (includeCategories) {
    query.select(knex.raw(categoriesQuery))
  }

  return query
}

export async function createBook(req, res) {
  if (req.file && req.file.path) {
    req.body.cover_url = req.file.path
  }

  try {
    const [id] = await knex('book').insert(req.body)

    const [book] = await baseQuery({
      includeAuthors: false,
      includeCategories: false
    }).where('book_id', id)

    res.status(201).json(book)
  } catch (err) {
    handleError(err, res)
  }
}

export async function updateBookById(req, res) {
  const { id } = req.params

  if (req.file && req.file.path) {
    req.body.cover_url = req.file.path
  }

  try {
    const affectedRows = await knex('book')
      .update(req.body)
      .where('book_id', id)

    if (!affectedRows) {
      return notExistsError(res, id)
    }

    const [book] = await baseQuery({
      includeAuthors: true,
      includeCategories: true
    }).where('book_id', id)

    book.authors = JSON.parse(book.authors)
    book.categories = JSON.parse(book.categories)

    res.status(200).json(book)
  } catch (err) {
    handleError(err, res)
  }
}

export async function getBookById(req, res) {
  const { id } = req.params

  try {
    const [book] = await baseQuery({
      includeAuthors: true,
      includeCategories: true
    }).where('book_id', id)

    if (!book) {
      return notExistsError(res, id)
    }

    book.authors = JSON.parse(book.authors)
    book.categories = JSON.parse(book.categories)

    res.status(200).json(book)
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteBookById(req, res) {
  const { id } = req.params

  try {
    const affectedRows = await knex.transaction(async trx => {
      await knex('book_category').delete().where('book_id', id).transacting(trx)
      await knex('book_author').delete().where('book_id', id).transacting(trx)
      await knex('book_rating').delete().where('book_id', id).transacting(trx)
      return await knex('book').delete().where('book_id', id).transacting(trx)
    })

    if (!affectedRows) {
      return notExistsError(res, id)
    }
    res.status(204).json()
  } catch (err) {
    handleError(err, res)
  }
}

const attachFilters = (req, query) => {
  query.where(builder => {
    if (req.query.title) {
      builder.whereRaw(
        "SOUNDEX(title) LIKE CONCAT(TRIM(TRAILING '0' FROM SOUNDEX(?)), '%')",
        [req.query.title]
      )
    }

    if (req.query.publicationdatestart) {
      builder.where('publication_date', '>=', req.query.publicationdatestart)
    }
    if (req.query.publicationdateend) {
      builder.where('publication_date', '<=', req.query.publicationdateend)
    }
    if (req.query.ratings) {
      builder.whereIn(knex.raw('CEIL(avg_rating)'), req.query.ratings)
    }
  })
}

export async function getBooksCount(req, res) {
  try {
    const query = knex('book').select(knex.raw('count(*) as count'))

    attachFilters(req, query)

    const [result] = await query

    res.status(200).json(result)
  } catch (err) {
    return handleError(err)
  }
}

export async function getBooks(req, res) {
  const query = baseQuery({
    includeAuthors: req.query.includeauthors,
    includeCategories: req.query.includecategories
  })
    .limit(req.query.perpage)
    .offset(req.query.perpage * req.query.page)

  const countQuery = knex('book').select(knex.raw('count(*) as count'))

  attachFilters(req, query)
  attachFilters(req, countQuery)

  if (req.query.orderby) {
    const [apiColumn, sortingOrder] = req.query.orderby.split('-')

    const dbColumn =
      { publicationdate: 'publication_date' }[apiColumn] ?? apiColumn

    query.orderBy(dbColumn, sortingOrder ?? 'desc')
  }

  try {
    const results = await query

    for (const res of results) {
      if (req.query.includeauthors) {
        res.authors = JSON.parse(res.authors)
      }
      if (req.query.includecategories) {
        res.categories = JSON.parse(res.categories)
      }
    }

    const [countResult] = await countQuery
    const totalCount = countResult.count

    paginationHeaders(res, totalCount, req.query.page, req.query.perpage)

    res.status(200).json(results)
  } catch (err) {
    handleError(err, res)
  }
}
