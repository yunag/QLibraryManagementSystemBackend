import { handleError } from '../common/error.js'
import {
  addWhereClause,
  constructOrderBy,
  getFilters
} from '../common/query.js'
import pool from '../database/database.js'

/**
 * @param props {{
 *  includeAuthors: boolean,
 *  includeCategories: boolean,
 *  filters: string[],
 *  orderBy: string,
 *  limit: string,
 *  offset: string
 * }}
 * @returns {string} query
 */
function constructQuery(props) {
  const {
    includeAuthors = false,
    includeCategories = false,
    filters = [],
    orderby = '',
    limit = '',
    offset = ''
  } = props

  const fields = [
    'book_id as id',
    'title',
    'description',
    'cover_url',
    "date_format(publication_date, '%m-%d-%Y') as publication_date",
    'copies_owned'
  ]

  if (includeAuthors) {
    fields.push(`COALESCE((
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
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
  `)
  }

  if (includeCategories) {
    fields.push(`COALESCE((
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'id', c.category_id,
        'name', c.name
        )
      ) FROM category AS c
      INNER JOIN book_category bc ON bc.category_id = c.category_id
      WHERE bc.book_id = b.book_id
      ORDER BY c.name
    ),
    JSON_ARRAY()
  ) AS categories
  `)
  }

  const whereClause =
    filters.length === 0 ? '' : 'WHERE ' + filters.join(' AND ')

  return `SELECT ${fields.join(', ')} FROM book b ${whereClause} ${orderby} ${limit} ${offset}`
}

async function getBookByIdAsync(id) {
  const q = constructQuery({
    includeAuthors: true,
    includeCategories: true,
    filters: ['book_id = ?']
  })

  const [[book]] = await pool.query(q, [id])

  if (book) {
    book.categories = JSON.parse(book.categories)
    book.authors = JSON.parse(book.authors)
  }

  return book
}

function notExistsError(res, id) {
  return res.status(404).json({
    error: `Author with id=${id} does not exists`
  })
}

export async function updateBookById(req, res) {
  const { id } = req.params

  if (req.file && req.file.path) {
    req.body.cover_url = req.file.path
  }

  const q = `UPDATE book SET ? WHERE book_id = ?`

  try {
    const [result] = await pool.query(q, [req.body, id])

    if (result.affectedRows) {
      const book = await getBookByIdAsync(id)

      res.status(200).json(book)
    } else {
      notExistsError(res, id)
    }
  } catch (err) {
    handleError(err, res)
  }
}

export async function createBook(req, res) {
  const q = `INSERT INTO book SET ?`

  if (req.file && req.file.path) {
    req.body.cover_url = req.file.path
  }

  try {
    const [result] = await pool.query(q, [req.body])

    const book = await getBookByIdAsync(result.insertId)

    res.status(201).json(book)
  } catch (err) {
    handleError(err, res)
  }
}

export async function getBookById(req, res) {
  const { id } = req.params

  try {
    const book = await getBookByIdAsync(id)

    if (!book) {
      return notExistsError(res, id)
    }

    res.status(200).json(book)
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteBookById(req, res) {
  const { id } = req.params

  const q = `DELETE FROM book WHERE book_id = ?`

  try {
    const [result] = await pool.query(q, [id])

    if (result.affectedRows) {
      res.status(204).json()
    } else {
      notExistsError(res, id)
    }
  } catch (err) {
    handleError(err, res)
  }
}

const availableFilters = query => [
  { filter: 'title = ?', value: query.title },
  { filter: 'publication_date > ?', value: query.publicationdatestart },
  { filter: 'publication_date < ?', value: query.publicationdateend }
]

export async function getBooksCount(req, res) {
  const { filters, values } = getFilters(availableFilters(req.query))

  const q = addWhereClause('SELECT COUNT(*) as count FROM book', filters)

  try {
    const [[result]] = await pool.query(q, values)

    res.status(200).json({ count: result.count })
  } catch (err) {
    return handleError(err)
  }
}

export async function getBooks(req, res) {
  const userQuery = req.query

  const { filters, values } = getFilters(availableFilters(userQuery))

  const q = constructQuery({
    includeAuthors: userQuery.includeauthors,
    includeCategories: userQuery.includecategories,
    filters: filters,
    limit: 'LIMIT ?',
    offset: 'OFFSET ?',
    orderBy: constructOrderBy(userQuery.orderby, {
      publicationdate: 'publication_date'
    })
  })

  values.push(userQuery.limit, userQuery.offset)

  try {
    const [results] = await pool.query(q, values)

    for (const res of results) {
      if (userQuery.includeauthors) {
        res.authors = JSON.parse(res.authors)
      }
      if (userQuery.includecategories) {
        res.categories = JSON.parse(res.categories)
      }
    }

    res.status(200).json(results)
  } catch (err) {
    handleError(err, res)
  }
}
