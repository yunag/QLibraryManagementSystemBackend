import { z } from 'zod'
import {
  AuthorSchema,
  BookSchema,
  CategorySchema,
  UserSchema
} from '../database/schema.js'

export default schema => (req, res, next) => {
  try {
    const validated = z.object(schema).parse({
      body: req.body,
      query: req.query,
      params: req.params
    })

    Object.assign(req, validated)

    next()
  } catch (err) {
    return res.status(400).send(err.issues)
  }
}

const includeTypeField = z.coerce
  .boolean()
  .transform(_arg => true)
  .optional()

export const Login = {
  body: UserSchema
}

export const CreateBook = {
  body: BookSchema.omit({ cover_url: true })
}

export const UpdateBook = {
  body: BookSchema.omit({ cover_url: true }).partial()
}

export const Category = {
  body: CategorySchema
}

export const CreateAuthor = {
  body: AuthorSchema.omit({ image_url: true })
}

export const UpdateAuthor = {
  body: AuthorSchema.omit({ image_url: true }).partial()
}

export const GetBooksCount = {
  query: z.object({
    title: z.string().trim().optional(),
    publicationdatestart: z.coerce.date().optional(),
    publicationdateend: z.coerce.date().optional()
  })
}

export const GetBooks = {
  query: z
    .object({
      limit: z.coerce.number().min(1).max(5000).default(200),
      offset: z.coerce.number().min(0).default(0),
      title: z.string().trim().optional(),
      publicationdatestart: z.coerce.date().optional(),
      publicationdateend: z.coerce.date().optional(),
      includeauthors: includeTypeField,
      includecategories: includeTypeField,
      orderby: z
        .enum([
          'publicationdate',
          'publicationdate-asc',
          'rating',
          'rating-asc',
          'title',
          'title-asc'
        ])
        .optional()
    })
    .strict()
}

export const GetAuthorsCount = {
  query: z.object({
    firstname: z.string().trim().optional(),
    lastname: z.string().trim().optional()
  })
}

export const GetAuthors = {
  query: z
    .object({
      limit: z.coerce.number().min(1).max(5000).default(200),
      offset: z.coerce.number().min(0).default(0),
      firstname: z.string().trim().optional(),
      lastname: z.string().trim().optional(),
      includebooks: includeTypeField,
      orderby: z
        .enum(['firstname', 'firstname-asc', 'lastname', 'lastname-asc'])
        .optional()
    })
    .strict()
}
