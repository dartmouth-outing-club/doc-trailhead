export class BadRequestError extends Error {
  constructor (message) {
    super(message)
    this.code = 400
    this.name = 'BadRequestError'
  }
}
