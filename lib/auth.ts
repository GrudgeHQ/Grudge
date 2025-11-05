import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          console.log('Missing credentials')
          return null
        }
        
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email } })
          if (!user) {
            console.log('User not found:', credentials.email)
            return null
          }
          
          if (!user.password) {
            console.log('User has no password set:', credentials.email)
            return null
          }
          
          const valid = await bcrypt.compare(credentials.password, user.password)
          if (!valid) {
            console.log('Invalid password for user:', credentials.email)
            return null
          }
          
          console.log('Login successful for user:', credentials.email)
          return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined }
        } catch (error) {
          console.error('Error during authentication:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (token?.sub) {
        // Extend the session user type to include id
        (session.user as any).id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
  },
}
