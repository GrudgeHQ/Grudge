export default function SportsSection() {
  return (
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
  );
}