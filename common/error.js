export function internalError(res) {
  return res.status(500).json({ error: 'Internal server error' })
}

export function handleError(err, res) {
  switch (err.code) {
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return res
        .status(400)
        .json({ error: 'Invalid Key: id not referencing anything' })
    case 'ER_DUP_ENTRY':
      return res.status(400).json({ error: 'Entry already exists' })

    default:
      console.error(err)
      return internalError(res)
  }
}
