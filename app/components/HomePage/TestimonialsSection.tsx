export default function TestimonialsSection() {
  return (
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
  );
}