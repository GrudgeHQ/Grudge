import HeroSection from './components/HomePage/HeroSection';
import FeaturesSection from './components/HomePage/FeaturesSection';
import CallToActionSection from './components/HomePage/CallToActionSection';
import LazyHomeSections from './components/HomePage/LazyHomeSections';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Fast-loading hero section */}
      <HeroSection />

      {/* Essential features section */}
      <FeaturesSection />

      {/* Lazy-loaded sections for better performance */}
      <LazyHomeSections />

      {/* Call to action */}
      <CallToActionSection />
    </div>
  );
}