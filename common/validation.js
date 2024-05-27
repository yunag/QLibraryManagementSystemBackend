import { z } from 'zod'
import { fromError } from 'zod-validation-error'
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
    const validationError = fromError(err)

    return res.status(400).json({ error: validationError.toString() })
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
  query: z
    .object({
      title: z.string().trim().optional(),
      publicationdatestart: z.coerce.date().optional(),
      publicationdateend: z.coerce.date().optional()
    })
    .strict()
}

export const GetBooks = {
  query: z
    .object({
      page: z.coerce.number().min(0).default(0),
      perpage: z.coerce.number().min(1).default(20),
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
          'title-asc',
          'id',
          'id-asc'
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
      page: z.coerce.number().min(0).default(0),
      perpage: z.coerce.number().min(1).default(20),
      firstname: z.string().trim().optional(),
      lastname: z.string().trim().optional(),
      includebooks: includeTypeField,
      orderby: z
        .enum(['firstname', 'firstname-asc', 'lastname', 'lastname-asc'])
        .optional()
    })
    .strict()
}

export const CreateOrUpdateRating = {
  body: z.object({
    rating: z.coerce.number().int().min(1).max(10)
  })
}

export const UpdateRalations = {
  body: z.object({
    ids: z.coerce.number().array()
  })
}
