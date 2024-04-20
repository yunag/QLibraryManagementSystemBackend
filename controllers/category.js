import { handleError } from '../common/error.js'
import pool from '../database/database.js'

async function getCategoryByIdAsync(id) {
  const q = 'SELECT category_id as id, name FROM category WHERE category_id = ?'

  const [[category]] = await pool.query(q, [id])

  return category
}

function notExistsError(res, id) {
  return res.status(404).json({
    error: `Book with id=${id} does not exists`
  })
}

export async function createCategory(req, res) {
  const { name } = req.body

  const q = 'INSERT INTO category (name) VALUES (?)'

  try {
    const [result] = await pool.query(q, [name])

    const category = await getCategoryByIdAsync(result.insertId)

    res.status(201).json(category)
  } catch (err) {
    handleError(err, res)
  }
}

export async function getCategoryById(req, res) {
  const { id } = req.params

  try {
    const category = await getCategoryByIdAsync(id)

    if (category) {
      res.status(200).json(category)
    } else {
      notExistsError(res, id)
    }
  } catch (err) {
    handleError(err, res)
  }
}

export async function getCategories(_req, res) {
  const q = 'SELECT category_id as id, name FROM category'

  try {
    const [results] = await pool.query(q)

    res.status(200).json(results)
  } catch (err) {
    handleError(err, res)
  }
}

export async function deleteCategoryById(req, res) {
  const { id } = req.params

  const q = 'DELETE FROM category WHERE category_id = ?'

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

export async function updateCategoryById(req, res) {
  const { id } = req.params

  const q = 'UPDATE category SET ? WHERE category_id = ?'

  try {
    const [result] = await pool.query(q, [req.body, id])

    if (result.affectedRows) {
      const category = await getCategoryByIdAsync(id)

      res.status(200).json(category)
    } else {
      notExistsError(res, id)
    }
  } catch (err) {
    handleError(err, res)
  }
}
