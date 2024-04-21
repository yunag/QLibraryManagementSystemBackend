import knex from 'knex'

export default knex({
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST,
    port: 3306,
    user: 'root',
    password: process.env.MYSQL_ROOT_PASSWORD,
    database: 'qlibrarydb'
  },
  pool: { min: 0, max: 7 }
})
