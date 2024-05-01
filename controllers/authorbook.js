import { handleError } from '../common/error.js'
import knex from '../database/database.js'

export async function createRelation(req, res) {
  const { bookid, authorid } = req.params

  try {
    await knex('book_author').insert({
      author_id: authorid,
      book_id: bookid
    })

    res.status(201).json()
  } catch (err) {
    handleError(err, res)
  }
}

export async function updateRelations(req, res) {
  const { bookid } = req.params
  const { ids } = req.body

  try {
    const relations = ids.map(id => ({ author_id: id, book_id: bookid }))

    await knex.transaction(async trx => {
      await knex('book_author')
        .delete()
        .where('book_id', bookid)
        .transacting(trx)

      if (relations.length) {
        await knex('book_author').insert(relations).transacting(trx)
      }
    })

    res.status(200).json()
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteRelation(req, res) {
  const { bookid, authorid } = req.params

  try {
    const affectedRows = await knex('book_author')
      .delete()
      .where('author_id', authorid)
      .where('book_id', bookid)

    if (!affectedRows) {
      return res.status(404).json({
        error: `Relation author_id=${authorid}, book_id=${bookid} does not exists`
      })
    }

    res.status(204).json()
  } catch (err) {
    handleError(err, res)
  }
}
