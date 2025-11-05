import Link from "next/link";

export default function HeroSection() {
  return (
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
  );
}