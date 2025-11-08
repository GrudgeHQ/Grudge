interface TeamTabsProps {
  teamId: any;
  members: any;
  isAdmin: any;
  isMember: any;
  teamName: any;
}

import React from 'react';

function formatDate(date: any) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
}

export default function TeamTabs(props: TeamTabsProps) {
  const { members, isAdmin, isMember, teamName } = props;
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
      <h2 className="text-xl font-bold mb-4 text-white">Roster ({members?.length || 0} member{members?.length === 1 ? '' : 's'})</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-slate-300 border-b border-slate-700">
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members && members.length > 0 ? members.map((m: any) => (
              <tr key={m.user?.id || m.id} className="border-b border-slate-800">
                <td className="py-2 px-3 text-white">{m.user?.name || 'Unknown User'}</td>
                <td className="py-2 px-3 text-slate-200">{m.role || (m.isAdmin ? 'Admin' : 'Member')}</td>
                <td className="py-2 px-3">
                  {m.isAdmin ? <span className="text-blue-400 font-semibold">Admin</span> : 'Member'}
                </td>
                <td className="py-2 px-3 text-slate-300">{formatDate(m.joinedAt)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">No members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        {isAdmin && <span className="text-blue-400">You are an admin</span>}
        {!isAdmin && isMember && <span className="text-green-400">You are a member</span>}
      </div>
    </div>
  );
}
