import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import TeamTabs from '../../components/TeamTabs'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function TeamPage({ params }: { params: { teamId?: string } } | { params: Promise<{ teamId?: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any

  // In Next.js 16, params may be a Promise in RSC. Unwrap if needed.
  const resolved = (params as any) instanceof Promise ? await (params as any) : params
  const teamId = typeof resolved?.teamId === 'string' && resolved.teamId.trim().length > 0 ? resolved.teamId : undefined
  if (!teamId) {
    // Invalid or missing teamId => 404
    notFound()
  }

  const team = await prisma.team.findUnique({ where: { id: teamId! }, include: { members: { include: { user: true } } } })
  if (!team) return (<main className="p-6">Team not found</main>)

  const isMember = session?.user?.email ? team.members.some((m) => m.user?.email === session.user.email) : false
  const isAdmin = session?.user?.email ? team.members.some((m) => m.user?.email === session.user.email && m.isAdmin) : false

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{team.name}</h1>
        <div className="text-sm text-gray-300">Sport: {team.sport}</div>
      </div>

      <div className="mb-4 bg-slate-800 border border-slate-700 p-3 rounded">
        <div className="text-gray-300">Invite code: <strong className="text-blue-400">{team.inviteCode}</strong></div>
      </div>

      {isMember ? (
        <TeamTabs 
          teamId={team.id} 
          members={team.members} 
          isAdmin={isAdmin} 
          isMember={isMember}
          teamName={team.name}
        />
      ) : (
        <div className="mt-6">
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 hover:underline">Back to dashboard</Link>
        </div>
      )}
    </main>
  )
}
