import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function TeamsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect('/login')
  }

  // Redirect to dashboard for now as teams functionality is integrated there
  redirect('/dashboard')
}
