'use client'

import React, { lazy, Suspense, ComponentType } from 'react'
import LoadingSpinner from './LoadingSpinner'

// Enhanced lazy loading with proper TypeScript support
export const LazyTournamentBracket = lazy(() => 
  import('./TournamentBracket').then(module => ({ default: module.default }))
)

export const LazyTournamentCreateForm = lazy(() => 
  import('./TournamentCreateForm').then(module => ({ default: module.default }))
)


export const LazyTeamAdminPanel = lazy(() => 
  import('./TeamAdminPanel').then(module => ({ default: module.default }))
)

export const LazyTeamChatClient = lazy(() => 
  import('./TeamChatClient').then(module => ({ default: module.default }))
)

export const LazyTournamentList = lazy(() => 
  import('./TournamentList').then(module => ({ default: module.default }))
)

export const LazyMatchProposalForm = lazy(() => 
  import('./MatchProposalForm').then(module => ({ default: module.default }))
)

export const LazyScoreSubmissionForm = lazy(() => 
  import('./ScoreSubmissionForm').then(module => ({ default: module.default }))
)

// Enhanced loading components for different contexts
const ComponentSkeleton = ({ height = 'h-32' }: { height?: string }) => (
  <div className={`animate-pulse space-y-4 ${height}`}>
    <div className="h-8 bg-slate-700 rounded w-3/4"></div>
    <div className="space-y-3">
      <div className="h-6 bg-slate-600 rounded"></div>
      <div className="h-6 bg-slate-600 rounded w-5/6"></div>
      <div className="h-6 bg-slate-600 rounded w-4/6"></div>
    </div>
  </div>
)

const FormSkeleton = () => (
  <div className="animate-pulse space-y-6 bg-slate-800 p-6 rounded-lg">
    <div className="h-8 bg-slate-700 rounded w-1/2"></div>
    <div className="space-y-4">
      <div className="h-12 bg-slate-700 rounded"></div>
      <div className="h-12 bg-slate-700 rounded"></div>
      <div className="h-12 bg-slate-700 rounded"></div>
    </div>
    <div className="h-10 bg-slate-600 rounded w-32"></div>
  </div>
)

const ListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse bg-slate-800 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-3 bg-slate-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)

// HOC for lazy loading with error boundaries
const withLazyLoading = <P extends object>(
  LazyComponent: ComponentType<P>,
  fallback: React.ReactElement = <LoadingSpinner />
) => {
  return (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

// Pre-configured wrapper components with appropriate skeletons
export const TournamentBracketWithSuspense = withLazyLoading(
  LazyTournamentBracket,
  <ComponentSkeleton height="h-96" />
)

export const TournamentCreateFormWithSuspense = withLazyLoading(
  LazyTournamentCreateForm,
  <FormSkeleton />
)


export const TeamAdminPanelWithSuspense = withLazyLoading(
  LazyTeamAdminPanel,
  <ComponentSkeleton height="h-48" />
)

export const TeamChatClientWithSuspense = withLazyLoading(
  LazyTeamChatClient,
  <ComponentSkeleton height="h-96" />
)

export const TournamentListWithSuspense = withLazyLoading(
  LazyTournamentList,
  <ListSkeleton />
)

export const MatchProposalFormWithSuspense = withLazyLoading(
  LazyMatchProposalForm,
  <FormSkeleton />
)

export const ScoreSubmissionFormWithSuspense = withLazyLoading(
  LazyScoreSubmissionForm,
  <FormSkeleton />
)
