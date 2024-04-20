import { handleError } from '../common/error.js'
import {
  addWhereClause,
  constructOrderBy,
  getFilters
} from '../common/query.js'
import pool from '../database/database.js'

/**
 * @param props {{
 *  includeBooks: boolean,
 *  filters: string[],
 *  orderBy: string,
 *  limit: string,
 *  offset: string
 * }}
 * @returns {string} query
 */
function constructQuery(props) {
  const {
    includeBooks = false,
    filters = [],
    orderby = '',
    limit = '',
    offset = ''
  } = props

  const fields = ['author_id as id', 'first_name', 'last_name', 'image_url']

  if (includeBooks) {
    fields.push(`COALESCE((
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
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
  `)
  }

  const whereClause =
    filters.length === 0 ? '' : 'WHERE ' + filters.join(' AND ')

  return `SELECT ${fields.join(', ')} FROM author a ${whereClause} ${orderby} ${limit} ${offset}`
}

async function getAuthorByIdAsync(id) {
  const q = constructQuery({
    includeBooks: true,
    filters: ['author_id = ?']
  })

  const [[author]] = await pool.query(q, [id])
  if (author) {
    author.books = JSON.parse(author.books)
  }

  return author
}

function notExistsError(res, id) {
  return res.status(404).json({
    error: `Author with id=${id} does not exists`
  })
}

export async function getAuthorById(req, res) {
  const { id } = req.params

  try {
    const author = await getAuthorByIdAsync(id)

    if (author) {
      res.status(200).json(author)
    } else {
      notExistsError(res, id)
    }
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteAuthorById(req, res) {
  const { id } = req.params

  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    /* Delete relations */
    await conn.query(
      `DELETE ba FROM book_author ba
       WHERE ba.author_id = ?`,
      [id]
    )

    const [result] = await conn.query(
      `DELETE FROM author
       WHERE author_id = ?`,
      [id]
    )

    if (result.affectedRows) {
      res.status(204).json()
    } else {
      notExistsError(res, id)
    }

    await conn.commit()
  } catch (err) {
    handleError(err, res)
    await conn.rollback()
  }
}

export async function updateAuthorById(req, res) {
  const { id } = req.params

  if (req.file && req.file.path) {
    req.body.image_url = req.file.path
  }

  const q = `UPDATE author SET ? WHERE author_id = ?`

  try {
    const [result] = await pool.query(q, [req.body, id])

    if (result.affectedRows) {
      const author = await getAuthorByIdAsync(id)

      res.status(200).json(author)
    } else {
      notExistsError(res, id)
    }
  } catch (err) {
    handleError(err, res)
  }
}

export async function createAuthor(req, res) {
  const q = `INSERT INTO author SET ?`

  if (req.file && req.file.path) {
    req.body.image_url = req.file.path
  }

  try {
    const [result] = await pool.query(q, [req.body])

    const author = await getAuthorByIdAsync(result.insertId)

    res.status(200).json(author)
  } catch (err) {
    handleError(err, res)
  }
}

const availableFilters = query => [
  { filter: 'first_name = ?', value: query.firstname },
  { filter: 'last_name = ?', value: query.lastname }
]

export async function getAuthorsCount(req, res) {
  const { filters, values } = getFilters(availableFilters(req.query))

  const q = addWhereClause('SELECT COUNT(*) as count FROM author', filters)

  try {
    const [[result]] = await pool.query(q, values)

    res.status(200).json({ count: result.count })
  } catch (err) {
    return handleError(err)
  }
}

export async function getAuthors(req, res) {
  const userQuery = req.query

  const { filters, values } = getFilters(availableFilters(req.query))

  const q = constructQuery({
    includeBooks: userQuery.includebooks,
    filters: filters,
    limit: 'LIMIT ?',
    offset: 'OFFSET ?',
    orderBy: constructOrderBy(userQuery.orderby, {
      firstname: 'first_name',
      lastname: 'last_name'
    })
  })

  values.push(userQuery.limit, userQuery.offset)

  try {
    const [results] = await pool.query(q, values)

    for (const res of results) {
      if (userQuery.includebooks) {
        res.books = JSON.parse(res.books)
      }
    }

    res.status(200).json(results)
  } catch (err) {
    handleError(err, res)
  }
}
