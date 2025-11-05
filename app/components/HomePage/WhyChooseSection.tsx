export default function WhyChooseSection() {
  return (
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
  );
}