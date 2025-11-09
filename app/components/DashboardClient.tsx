import React from 'react';

interface DashboardClientProps {
  initialMemberships?: any;
  userEmail?: any;
}

const DashboardClient: React.FC<DashboardClientProps> = (props) => {
  return (
    <div className="p-8 bg-slate-800 text-white rounded shadow mt-4">
      <h2 className="text-xl font-bold mb-4">Welcome{props.userEmail ? `, ${props.userEmail}` : ''}!</h2>
      <p className="mb-2">Your dashboard content goes here.</p>
      <ul className="list-disc pl-6">
        {props.initialMemberships && props.initialMemberships.length > 0 ? (
          props.initialMemberships.map((m: any, i: number) => (
            <li key={i} className="mb-1">Team: <span className="font-semibold">{m.team?.name || 'Unknown'}</span></li>
          ))
        ) : (
          <li>No team memberships found.</li>
        )}
      </ul>
    </div>
  );
};

export default DashboardClient;
