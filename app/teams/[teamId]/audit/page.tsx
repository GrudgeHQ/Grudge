import React from 'react'
import { prisma } from '@/lib/prisma'

type Props = {
  params: { teamId: string }
}

export default async function AuditPage({ params }: Props) {
  const { teamId } = params

  const logs = await prisma.auditLog.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Audit log</h1>
      {logs.length === 0 ? (
        <p className="text-muted-foreground">No audit entries found for this team.</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((l) => (
            <li key={l.id} className="p-3 border rounded">
              <div className="flex items-baseline justify-between">
                <div>
                  <strong className="mr-2">{l.action}</strong>
                  <span className="text-sm text-gray-600">by {l.actorId}</span>
                </div>
                <div className="text-sm text-gray-500">{new Date(l.createdAt).toLocaleString()}</div>
              </div>
              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(l.payload, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
