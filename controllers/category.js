import { handleError } from '../common/error.js'
import knex from '../database/database.js'

function notExistsError(res, id) {
  return res.status(404).json({
    error: `Category with id=${id} does not exists`
  })
}

const baseQuery = () => knex('category').select({ id: 'category_id' }, 'name')

export async function createCategory(req, res) {
  try {
    const [id] = await knex('category').insert(req.body)

    const [category] = await baseQuery().where('category_id', id)

    res.status(201).json(category)
  } catch (err) {
    handleError(err, res)
  }
}

export async function getCategoryById(req, res) {
  const { id } = req.params

  try {
    const [category] = await baseQuery().where('category_id', id)

    if (!category) {
      return notExistsError(res, id)
    }

    res.status(200).json(category)
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteCategoryById(req, res) {
  const { id } = req.params

  try {
    const affectedRows = await knex.transaction(async trx => {
      await knex('book_category')
        .delete()
        .where('category_id', id)
        .transacting(trx)

      return await knex('category')
        .delete()
        .where('category_id', id)
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

export async function updateCategoryById(req, res) {
  const { id } = req.params

  try {
    const affectedRows = await knex('category')
      .update(req.body)
      .where('category_id', id)

    if (!affectedRows) {
      return notExistsError(res, id)
    }

    const [category] = await baseQuery().where('category_id', id)

    res.status(200).json(category)
  } catch (err) {
    handleError(err, res)
  }
}

export async function getCategories(_req, res) {
  try {
    const results = await baseQuery()

    res.status(200).json(results)
  } catch (err) {
    handleError(err, res)
  }
}
