'use client';

import React, { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';

// Lazy load heavy components
const SportsSection: ComponentType = lazy(() => import('./SportsSection'));
const WhyChooseSection: ComponentType = lazy(() => import('./WhyChooseSection'));
const TestimonialsSection: ComponentType = lazy(() => import('./TestimonialsSection'));

// Loading skeleton component
function SectionSkeleton() {
  return (
    <div className="py-20 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2 mx-auto mb-12"></div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const LazyHomeSections: React.FC = () => {
  return (
    <>
      <Suspense fallback={<SectionSkeleton />}>
        <SportsSection />
      </Suspense>
      
      <Suspense fallback={<SectionSkeleton />}>
        <WhyChooseSection />
      </Suspense>
      
      <Suspense fallback={<SectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>
    </>
  );
};

export default LazyHomeSections;