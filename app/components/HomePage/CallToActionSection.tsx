import Link from "next/link";

export default function CallToActionSection() {
  return (
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
  );
}