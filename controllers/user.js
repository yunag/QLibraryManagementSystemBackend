import knex from '../database/database.js'
import bcrypt from 'bcrypt'

import jwt from 'jsonwebtoken'
import { handleError } from '../common/error.js'

export async function register(req, res) {
  const { username, password } = req.body

  try {
    const [user] = await knex('user')
      .select('username', 'password')
      .where('username', username)

    if (user) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const saltRounds = 10
    const salt = await bcrypt.genSalt(saltRounds)
    const hashedPassword = await bcrypt.hash(password, salt)

    await knex('user').insert({ username: username, password: hashedPassword })

    res.status(200).json({ ok: 'User successfully created' })
  } catch (err) {
    handleError(err, res)
  }
}

export async function login(req, res) {
  const { username, password } = req.body

  try {
    const [user] = await knex('user')
      .select('password')
      .where('username', username)

    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(400).json({ error: 'Invalid username or password' })
    }

    const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY)

    res.status(200).json({ token })
  } catch (err) {
    handleError(err, res)
  }
}

export async function updateUser(req, res) {
  const { id } = req.params
  const { username } = req.body.username

  const userId = req.user.userId

  if (id !== userId) {
    return res.status(403).json({ error: 'No access' })
  }

  try {
    const affectedRows = await knex('user')
      .update({ username })
      .where('user_id', id)

    if (!affectedRows) {
      return res
        .status(404)
        .json({ error: `User with id=${id} does not exists` })
    }

    res.status(200).json()
  } catch (err) {
    handleError(err, res)
  }
}
