import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <main className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-50"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          {/* Main Hero */}
          <div className="text-center mb-20">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium">
                🏆 The Complete Sports Team Solution
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent leading-none pb-2">
              Grudge
            </h1>
            
            <p className="text-2xl md:text-3xl text-gray-200 mb-6 font-light">
              Elevate Your Team Management
            </p>
            
            <p className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              From pickup games to competitive leagues, Grudge transforms how sports teams organize, 
              communicate, and compete. Everything you need to manage your team in one powerful platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href="/register"
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all text-lg shadow-lg hover:shadow-blue-500/25"
              >
                Start Your Team
                <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-slate-800/80 backdrop-blur border-2 border-slate-600/50 text-white font-semibold rounded-xl hover:bg-slate-700/80 hover:border-slate-500/50 active:scale-95 transition-all text-lg"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <div className="group p-8 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl hover:border-blue-500/30 transition-all duration-300">
              <div className="mb-4 p-3 bg-blue-600/20 rounded-xl w-fit">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-blue-400 transition-colors">
                Smart Team Management
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Create unlimited teams, manage member roles, track attendance, and handle invitations with intelligent admin controls and member permissions.
              </p>
            </div>
            
            <div className="group p-8 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl hover:border-purple-500/30 transition-all duration-300">
              <div className="mb-4 p-3 bg-purple-600/20 rounded-xl w-fit">
                <span className="text-3xl">⚽</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-purple-400 transition-colors">
                Advanced Scheduling
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Schedule matches, practices, and scrimmages. Track player availability, send assignments, and manage complex tournament brackets with ease.
              </p>
            </div>
            
            <div className="group p-8 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl hover:border-green-500/30 transition-all duration-300">
              <div className="mb-4 p-3 bg-green-600/20 rounded-xl w-fit">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-green-400 transition-colors">
                Real-time Communication
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Team chat, league discussions, notifications, and live updates keep everyone connected and informed about what matters most.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Comprehensive Features Section */}
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

      {/* Sports Support Section */}
      <section className="py-16 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Built for Every Sport
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            From soccer to basketball, tennis to rugby - Grudge adapts to your sport's unique needs
          </p>
          
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-4 max-w-4xl mx-auto">
            {[
              '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', 
              '🏓', '🏸', '🏑', '🥍', '🏊', '🥊'
            ].map((sport, index) => (
              <div key={index} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <span className="text-2xl">{sport}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Grudge */}
      <section className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Teams Choose Grudge
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Built by athletes, for athletes. See what makes Grudge the go-to platform for sports teams.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Easy Setup */}
            <div className="text-center p-6">
              <div className="mb-4 p-4 bg-green-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Quick Setup</h3>
              <p className="text-gray-300">
                Get your team up and running in minutes. Simple invite codes, instant member management, and intuitive interface design.
              </p>
            </div>

            {/* All-in-One */}
            <div className="text-center p-6">
              <div className="mb-4 p-4 bg-blue-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">All-in-One Platform</h3>
              <p className="text-gray-300">
                No more juggling multiple apps. Everything from scheduling to communication to statistics in one unified platform.
              </p>
            </div>

            {/* Mobile First */}
            <div className="text-center p-6">
              <div className="mb-4 p-4 bg-purple-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Mobile-First Design</h3>
              <p className="text-gray-300">
                Perfect on any device. Progressive web app technology means fast, reliable access whether you're on the field or at home.
              </p>
            </div>

            {/* Real-time Updates */}
            <div className="text-center p-6">
              <div className="mb-4 p-4 bg-yellow-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Live Updates</h3>
              <p className="text-gray-300">
                Real-time notifications, live chat, and instant updates keep everyone synchronized and informed about team activities.
              </p>
            </div>

            {/* Flexible */}
            <div className="text-center p-6">
              <div className="mb-4 p-4 bg-red-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Highly Flexible</h3>
              <p className="text-gray-300">
                Adapts to your team's unique needs. From casual pickup games to competitive leagues, Grudge scales with your ambitions.
              </p>
            </div>

            {/* Community */}
            <div className="text-center p-6">
              <div className="mb-4 p-4 bg-indigo-600/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Built for Community</h3>
              <p className="text-gray-300">
                Connect with other teams, create leagues, and build lasting relationships within your local sports community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Teams Love Grudge
            </h2>
            <p className="text-lg text-gray-300">
              See how teams are transforming their game with Grudge
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {'★'.repeat(5)}
                </div>
                <p className="text-gray-300 italic">
                  "Finally, all our team coordination in one place. No more group chats getting lost or missed practice notifications!"
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">MC</span>
                </div>
                <div>
                  <div className="text-white font-medium">Maria Chen</div>
                  <div className="text-gray-400 text-sm">Captain, Thunder Bolts FC</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {'★'.repeat(5)}
                </div>
                <p className="text-gray-300 italic">
                  "League management has never been easier. Our 12-team league runs smoothly thanks to Grudge's tournament features."
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">JR</span>
                </div>
                <div>
                  <div className="text-white font-medium">Jake Rodriguez</div>
                  <div className="text-gray-400 text-sm">League Commissioner</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {'★'.repeat(5)}
                </div>
                <p className="text-gray-300 italic">
                  "The mobile app is perfect for on-the-go management. I can update lineups and send notifications right from the sideline."
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">AS</span>
                </div>
                <div>
                  <div className="text-white font-medium">Alex Singh</div>
                  <div className="text-gray-400 text-sm">Coach, Riverside Hawks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-t from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Team?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of teams already using Grudge to organize, compete, and win together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/register"
              className="group px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all text-lg shadow-lg hover:shadow-purple-500/25"
            >
              Create Your Team Now
              <span className="ml-2 group-hover:translate-x-1 transition-transform">🚀</span>
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 border-2 border-slate-600 text-white font-semibold rounded-xl hover:border-slate-500 hover:bg-slate-800/50 active:scale-95 transition-all text-lg"
            >
              Sign In to Continue
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8 text-sm text-gray-400">
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-400">✓</span>
              Free to get started
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-400">✓</span>
              No credit card required
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-400">✓</span>
              Setup in under 5 minutes
            </div>
          </div>

          <div className="text-sm text-gray-400">
            <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
              Already have an account? Go to Dashboard →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
