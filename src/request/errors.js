export class NotFoundError extends Error {
  constructor (message) {
    super(message)
    this.code = 404
    this.name = 'NotFoundError'
  }
}

export class BadRequestError extends Error {
  constructor (message) {
    super(message)
    this.code = 400
    this.name = 'BadRequestError'
  }
}
