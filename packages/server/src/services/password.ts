import bcrypt from 'bcryptjs'

const DEFAULT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? DEFAULT_ROUNDS))
}

export async function verifyPassword(password: string, passwordHash: string) {
  return {
    valid: await bcrypt.compare(password, passwordHash),
  }
}
