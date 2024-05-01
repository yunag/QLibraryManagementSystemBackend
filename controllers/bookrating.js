import { handleError } from '../common/error.js'
import knex from '../database/database.js'

async function createRating(req, res) {
  const { bookid } = req.params
  const { rating } = req.body

  const userId = req.user.userId

  try {
    await knex.transaction(async trx => {
      await knex('book_rating')
        .insert({
          book_id: bookid,
          user_id: userId,
          rating: rating
        })
        .transacting(trx)

      const [book] = await knex('book')
        .select('avg_rating', 'rate_count')
        .where('book_id', bookid)
        .transacting(trx)

      await knex('book')
        .update({
          avg_rating:
            (book.avg_rating * book.rate_count + rating) /
            (book.rate_count + 1),
          rate_count: book.rate_count + 1
        })
        .where('book_id', bookid)
        .transacting(trx)
    })

    res.status(201).json()
  } catch (err) {
    handleError(err, res)
  }
}

export async function createOrUpdateRating(req, res) {
  const { bookid } = req.params
  const { rating } = req.body

  const userId = req.user.userId

  try {
    await knex.transaction(async trx => {
      const [oldRate] = await knex('book_rating')
        .select({ oldRating: 'rating' })
        .where('book_id', bookid)
        .where('user_id', userId)
        .transacting(trx)

      if (!oldRate) {
        return createRating(req, res)
      }

      const { oldRating } = oldRate
      if (oldRating === rating) {
        return res.status(200).json()
      }

      await knex('book_rating')
        .update({
          rating: rating
        })
        .where('book_id', bookid)
        .where('user_id', userId)
        .transacting(trx)

      const [book] = await knex('book')
        .select('avg_rating', 'rate_count')
        .where('book_id', bookid)
        .transacting(trx)

      await knex('book')
        .update({
          avg_rating:
            (book.avg_rating * book.rate_count - oldRating + rating) /
            book.rate_count
        })
        .where('book_id', bookid)
        .transacting(trx)
    })

    res.status(200).json()
  } catch (err) {
    handleError(err, res)
  }
}
