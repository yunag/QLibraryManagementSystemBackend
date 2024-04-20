import { handleError } from '../common/error.js'
import pool from '../database/database.js'

export async function createRelation(req, res) {
  const { bookid, authorid } = req.params

  const q = 'INSERT INTO book_author (author_id, book_id) VALUES (?, ?)'

  try {
    const [_result] = await pool.query(q, [authorid, bookid])

    res.status(201).json({ ok: 'Relationship created' })
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteRelation(req, res) {
  const { bookid, authorid } = req.params

  const q = 'DELETE FROM book_author WHERE author_id = ? AND book_id = ?'

  try {
    const [result] = await pool.query(q, [authorid, bookid])

    if (result.affectedRows) {
      res.status(204).json()
    } else {
      res.status(404).json({
        error: `Relation author_id=${authorid}, book_id=${bookid} does not exists`
      })
    }
  } catch (err) {
    handleError(err, res)
  }
}
