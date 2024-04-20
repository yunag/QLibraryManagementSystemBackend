import { Router } from 'express'
import multer, { diskStorage } from 'multer'
import {
  BookController,
  UserController,
  AuthorController,
  AuthorBookController,
  CategoryController,
  BookCategoryController
} from '../controllers/index.js'
import authToken from '../middleware/auth.js'
import path from 'path'
import validate, * as Validation from '../common/validation.js'

const router = Router()
const upload_destination = 'uploads'

const storage = diskStorage({
  destination: upload_destination,
  filename: (_req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

const uploads = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MiB
  },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname)
    if (ext !== '.jpg' && ext !== '.png') {
      return callback(new Error('Only images are allowed'))
    }
    callback(null, true)
  }
})

/* Users */
router.post('/register', validate(Validation.Login), UserController.register)
router.post('/login', validate(Validation.Login), UserController.login)

/* Books */
router.post(
  '/books',
  authToken,
  uploads.single('cover'),
  validate(Validation.CreateBook),
  BookController.createBook
)
router.get(
  '/books',
  authToken,
  validate(Validation.GetBooks),
  BookController.getBooks
)
router.get(
  '/books/count',
  authToken,
  validate(Validation.GetBooksCount),
  BookController.getBooksCount
)
router.get('/books/:id', authToken, BookController.getBookById)
router.put(
  '/books/:id',
  authToken,
  uploads.single('cover'),
  validate(Validation.UpdateBook),
  BookController.updateBookById
)
router.delete('/books/:id', authToken, BookController.deleteBookById)

/* Authors */
router.post(
  '/authors',
  authToken,
  uploads.single('avatar'),
  validate(Validation.CreateAuthor),
  AuthorController.createAuthor
)
router.get('/authors/:id', authToken, AuthorController.getAuthorById)
router.get(
  '/authors',
  authToken,
  validate(Validation.GetAuthors),
  AuthorController.getAuthors
)
router.get(
  '/authors/count',
  authToken,
  validate(Validation.GetAuthorsCount),
  AuthorController.getAuthorsCount
)
router.put(
  '/authors/:id',
  authToken,
  uploads.single('avatar'),
  validate(Validation.UpdateAuthor),
  AuthorController.updateAuthorById
)
router.delete('/authors/:id', authToken, AuthorController.deleteAuthorById)

/* Categories */
router.post(
  '/categories',
  authToken,
  validate(Validation.Category),
  CategoryController.createCategory
)

router.get('/categories', authToken, CategoryController.getCategories)
router.get('/categories/:id', authToken, CategoryController.getCategoryById)
router.put('/categories/:id', authToken, CategoryController.updateCategoryById)
router.delete(
  '/categories/:id',
  authToken,
  CategoryController.deleteCategoryById
)

/* Relationship between authors and books */
router.post(
  '/authors/:authorid/books/:bookid',
  authToken,
  AuthorBookController.createRelation
)
router.delete(
  '/authors/:authorid/books/:bookid',
  authToken,
  AuthorBookController.deleteRelation
)

/* Relationship between books and categories */
router.post(
  '/books/:bookid/categories/:categoryid',
  authToken,
  BookCategoryController.createRelation
)
router.delete(
  '/books/:bookid/categories/:categoryid',
  authToken,
  BookCategoryController.deleteRelation
)

export default router
