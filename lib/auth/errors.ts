export class UnauthorizedError extends Error {
  constructor(message = 'No autenticado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Sin permisos') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = 'Demasiados intentos') {
    super(message)
    this.name = 'TooManyRequestsError'
  }
}
