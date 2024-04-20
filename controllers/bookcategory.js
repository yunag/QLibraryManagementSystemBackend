import { handleError } from '../common/error.js'
import pool from '../database/database.js'

export async function createRelation(req, res) {
  const { bookid, categoryid } = req.params

  const q = 'INSERT INTO book_category (book_id, category_id) VALUES (?, ?)'

  try {
    const [_result] = await pool.query(q, [bookid, categoryid])

    res.status(201).json({ ok: 'Relationship created' })
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteRelation(req, res) {
  const { bookid, categoryid } = req.params

  const q = 'DELETE FROM book_category WHERE book_id = ? AND category_id = ?'

  try {
    const [result] = await pool.query(q, [bookid, categoryid])

    if (result.affectedRows) {
      res.status(204).json()
    } else {
      res.status(404).json({
        error: `Relation book_id=${bookid}, category_id=${categoryid} does not exists`
      })
    }
  } catch (err) {
    handleError(err, res)
  }
}
