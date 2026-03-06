import { cookies } from 'next/headers'

export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get('next-auth.csrf-token')
  return token?.value || ''
}

export async function verifyCSRFToken(
  requestToken: string
): Promise<boolean> {
  const cookieStore = await cookies()
  const cookieToken = cookieStore.get('next-auth.csrf-token')

  if (!cookieToken) {
    return false
  }

  // Next.js CSRF token 格式: "hash|token"
  const [hash, token] = cookieToken.value.split('|')
  const [requestHash, requestTokenPart] = requestToken.split('|')

  return hash === requestHash && token === requestTokenPart
}
