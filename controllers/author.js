import { handleError } from '../common/error.js'
import { paginationHeaders } from '../common/pagination.js'
import knex from '../database/database.js'

/**
 * @param props {{
 *  includeBooks: boolean,
 * }}
 */
function baseQuery(props) {
  const { includeBooks = false } = props

  const query = knex({ a: 'author' }).select(
    { id: 'author_id' },
    'first_name',
    'last_name',
    'image_url'
  )

  const booksQuery = `
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', b.book_id,
          'title', b.title,
          'description', b.description,
          'cover_url', b.cover_url,
          'publication_date', date_format(publication_date, '%m-%d-%Y'),
          'copies_owned', b.copies_owned
        )
      ) FROM book AS b
      INNER JOIN book_author ba ON ba.book_id = b.book_id
      WHERE ba.author_id = a.author_id
      ORDER BY a.first_name
      ), JSON_ARRAY()
    ) AS books
  `

  if (includeBooks) {
    query.select(knex.raw(booksQuery))
  }

  return query
}

function notExistsError(res, id) {
  return res.status(404).json({
    error: `Author with id=${id} does not exists`
  })
}

export async function createAuthor(req, res) {
  if (req.file && req.file.path) {
    req.body.image_url = req.file.path
  }

  try {
    const [id] = await knex('author').insert(req.body)

    const [author] = await baseQuery({
      includeBooks: false
    }).where('author_id', id)

    res.status(201).json(author)
  } catch (err) {
    handleError(err, res)
  }
}

export async function getAuthorById(req, res) {
  const { id } = req.params

  try {
    const [author] = await baseQuery({ includeBooks: true }).where(
      'author_id',
      id
    )

    if (!author) {
      return notExistsError(res, id)
    }

    author.books = JSON.parse(author.books)

    res.status(200).json(author)
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteAuthorById(req, res) {
  const { id } = req.params

  try {
    const affectedRows = await knex.transaction(async trx => {
      await knex('book_author').delete().where('author_id', id).transacting(trx)

      return await knex('author')
        .delete()
        .where('author_id', id)
        .transacting(trx)
    })

    if (!affectedRows) {
      return notExistsError(res, id)
    }

    res.status(204).json()
  } catch (err) {
    handleError(err, res)
  }
}

export async function updateAuthorById(req, res) {
  const { id } = req.params

  if (req.file && req.file.path) {
    req.body.image_url = req.file.path
  }

  try {
    const affectedRows = await knex('author')
      .update(req.body)
      .where('author_id', id)

    if (!affectedRows) {
      return notExistsError(res, id)
    }

    const [author] = await baseQuery({
      includeBooks: true
    }).where('author_id', id)

    author.books = JSON.parse(author.books)

    res.status(200).json(author)
  } catch (err) {
    handleError(err, res)
  }
}

const attachFilters = (req, query) => {
  query.where(builder => {
    if (req.query.name) {
      builder.whereRaw(
        `LOWER(CONCAT(first_name, ' ', last_name)) LIKE ?`,
        '%' + req.query.name.split('').join('%') + '%'
      )
    }
    if (req.query.firstname) {
      builder.where('first_name', req.query.firstname)
    }
    if (req.query.lastname) {
      builder.where('last_name', req.query.lastname)
    }
  })
}

export async function getAuthorsCount(req, res) {
  try {
    const query = knex('author').select(knex.raw('count(*) as count'))

    attachFilters(req, query)

    const [result] = await query

    res.status(200).json(result)
  } catch (err) {
    return handleError(err)
  }
}

export async function getAuthors(req, res) {
  const query = baseQuery({
    includeBooks: req.query.includebooks
  })
    .limit(req.query.perpage)
    .offset(req.query.perpage * req.query.page)

  const countQuery = knex('author').select(knex.raw('count(*) as count'))

  attachFilters(req, query)
  attachFilters(req, countQuery)

  if (req.query.orderby) {
    const [apiColumn, sortingOrder] = req.query.orderby.split('-')

    const dbColumn =
      {
        firstname: 'first_name',
        lastname: 'last_name'
      }[apiColumn] ?? apiColumn

    query.orderBy(dbColumn, sortingOrder ?? 'desc')
  }

  try {
    const results = await query

    for (const res of results) {
      if (req.query.includebooks) {
        res.books = JSON.parse(res.books)
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
