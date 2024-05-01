import { handleError } from '../common/error.js'
import knex from '../database/database.js'

export async function createRelation(req, res) {
  const { bookid, categoryid } = req.params

  try {
    await knex('book_category').insert({
      book_id: bookid,
      category_id: categoryid
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
    const relations = ids.map(id => ({ category_id: id, book_id: bookid }))

    await knex.transaction(async trx => {
      await knex('book_category')
        .delete()
        .where('book_id', bookid)
        .transacting(trx)

      if (relations.length) {
        await knex('book_category').insert(relations).transacting(trx)
      }
    })

    res.status(200).json()
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteRelation(req, res) {
  const { bookid, categoryid } = req.params

  try {
    const affectedRows = await knex('book_category')
      .delete()
      .where('book_id', bookid)
      .where('category_id', categoryid)

    if (!affectedRows) {
      return res.status(404).json({
        error: `Relation book_id=${bookid}, category_id=${categoryid} does not exists`
      })
    }

    res.status(204).json()
  } catch (err) {
    handleError(err, res)
  }
}
