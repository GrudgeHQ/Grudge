export default function FeaturesSection() {
  return (
    <section className="py-20 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything Your Team Needs
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Comprehensive tools designed for teams of all sizes and skill levels
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Competition & Leagues */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-yellow-400">🏅</span>
              Leagues & Competition
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• League standings & statistics</li>
              <li>• Tournament management</li>
              <li>• Match proposals & scheduling</li>
              <li>• Performance tracking</li>
            </ul>
          </div>

          {/* Practice Management */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-orange-400">🏃</span>
              Practice Management
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Schedule practices</li>
              <li>• Track attendance</li>
              <li>• Location management</li>
              <li>• Availability confirmation</li>
            </ul>
          </div>

          {/* Match Organization */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-green-400">⚽</span>
              Match Organization
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Player assignments</li>
              <li>• Score tracking</li>
              <li>• Opponent management</li>
              <li>• Match history</li>
            </ul>
          </div>

          {/* Communication */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-cyan-400">💬</span>
              Team Communication
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Team chat channels</li>
              <li>• League discussions</li>
              <li>• Notifications system</li>
              <li>• Announcement tools</li>
            </ul>
          </div>

          {/* Scrimmages & Pickup */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-purple-400">🏆</span>
              Grudge Matches
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Create scrimmages</li>
              <li>• Pickup game organization</li>
              <li>• Participant management</li>
              <li>• Flexible team creation</li>
            </ul>
          </div>

          {/* Team Analytics */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-blue-400">📊</span>
              Team Analytics
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Performance statistics</li>
              <li>• Win/loss tracking</li>
              <li>• Player participation</li>
              <li>• Season summaries</li>
            </ul>
          </div>

          {/* Mobile Experience */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-pink-400">📱</span>
              Mobile Ready
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Progressive Web App</li>
              <li>• Offline capabilities</li>
              <li>• Push notifications</li>
              <li>• Touch-optimized interface</li>
            </ul>
          </div>

          {/* Administration */}
          <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-indigo-400">🔧</span>
              Team Administration
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Role-based permissions</li>
              <li>• Member management</li>
              <li>• Team settings</li>
              <li>• Invite code system</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}