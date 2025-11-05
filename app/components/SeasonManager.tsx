'use client'

import { useState, useEffect } from 'react'
import { League, Team, Tournament } from '@prisma/client'
import LoadingSpinner from './LoadingSpinner'
import ConfirmModal from './ConfirmModal'
import SeasonDashboard from './SeasonDashboard'

interface Season {
  id: string
  name: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED'
  scheduleType: 'ROUND_ROBIN' | 'FIXED_GAMES'
  gamesPerOpponent: number | null
  totalGamesPerTeam: number | null
  startDate: Date | null
  endDate: Date | null
  hasTournament: boolean
  tournamentName: string | null
  tournamentStartDate: Date | null
  tournament?: Tournament | null
  createdAt: Date
  seasonTeams?: any[]
  seasonMatches?: any[]
  seasonStandings?: any[]
}

interface SeasonManagerProps {
  league: League & { teams: Team[], tournaments: Tournament[] }
  isManager: boolean
}

export default function SeasonManager({ league, isManager }: SeasonManagerProps) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'current' | 'archived'>('current')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scheduleType: 'ROUND_ROBIN' as 'ROUND_ROBIN' | 'FIXED_GAMES',
    gamesPerOpponent: '',
    totalGamesPerTeam: '',
    startDate: '',
    endDate: '',
    hasTournament: false,
    tournamentName: '',
    selectedTeams: [] as string[]
  })
  const [creating, setCreating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<Season | null>(null)
  const [showTournamentPrompt, setShowTournamentPrompt] = useState<Season | null>(null)
  const [tournamentFormData, setTournamentFormData] = useState({
    name: '',
    startDate: '',
    format: 'SINGLE_ELIMINATION' as 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION'
  })
  const [creatingTournament, setCreatingTournament] = useState(false)

  useEffect(() => {
    fetchSeasons()
  }, [league.id])

  const fetchSeasons = async () => {
    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons`)
      if (response.ok) {
        const data = await response.json()
        const rawSeasons = data.seasons || []
        // Validate and filter seasons to ensure they have required properties
        const validSeasons = rawSeasons.filter((season: any) => {
          if (!season || !season.id) {
            console.warn('Invalid season data:', season)
            return false
          }
          return true
        })
        console.log('Fetched seasons:', validSeasons) // Debug log
        setSeasons(validSeasons)
      } else {
        const errorData = await response.json().catch(async () => {
          try {
            const text = await response.text()
            return { error: text }
          } catch {
            return {}
          }
        })
        console.error('Failed to fetch seasons:', response.status, response.statusText, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isManager || creating) return

    setCreating(true)
    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          scheduleType: formData.scheduleType,
          gamesPerOpponent: formData.scheduleType === 'ROUND_ROBIN' ? parseInt(formData.gamesPerOpponent) || 1 : null,
          totalGamesPerTeam: formData.scheduleType === 'FIXED_GAMES' ? parseInt(formData.totalGamesPerTeam) : null,
          startDate: formData.startDate ? new Date(formData.startDate) : null,
          endDate: formData.endDate ? new Date(formData.endDate) : null,
          hasTournament: formData.hasTournament,
          tournamentName: formData.hasTournament ? formData.tournamentName : null,
          selectedTeams: formData.selectedTeams
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newSeason = data.season || data // Handle both { season } and direct season object
        // Validate the new season object before adding to state
        if (newSeason && newSeason.id) {
          setSeasons(prev => [newSeason, ...prev])
          setShowCreateForm(false)
          resetForm()
        } else {
          console.error('Invalid season returned from API:', data)
          alert('Error: Invalid season data returned from server')
        }
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        alert(error?.error || 'Failed to create season')
      }
    } catch (error) {
      console.error('Failed to create season:', error)
      alert('Failed to create season')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSeason = async (season: Season) => {
    if (!isManager || season.status !== 'DRAFT') return

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSeasons(prev => prev.filter(s => s.id !== season.id))
        setShowDeleteModal(null)
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        alert(error?.error || 'Failed to delete season')
      }
    } catch (error) {
      console.error('Failed to delete season:', error)
      alert('Failed to delete season')
    }
  }

  const handleCompleteSeason = async (season: Season) => {
    if (!isManager || season.status !== 'ACTIVE') return
    
    if (!confirm(`Are you sure you want to complete the season "${season.name}"? This will finalize all standings and rankings.`)) {
      return
    }

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (response.ok) {
        const result = await response.json()
        fetchSeasons()
        
        // Show tournament creation prompt
        setTournamentFormData({
          name: `${season.name} Championship`,
          startDate: new Date().toISOString().split('T')[0],
          format: 'SINGLE_ELIMINATION'
        })
        setShowTournamentPrompt(season)
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        alert(error?.error || 'Failed to complete season')
      }
    } catch (error) {
      console.error('Failed to complete season:', error)
      alert('Failed to complete season')
    }
  }

  const handleCreateSeasonTournament = async () => {
    if (!showTournamentPrompt || creatingTournament) return
    
    setCreatingTournament(true)
    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${showTournamentPrompt.id}/create-tournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentFormData.name,
          startDate: tournamentFormData.startDate,
          format: tournamentFormData.format
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Tournament created successfully with seeded teams!')
        setShowTournamentPrompt(null)
        fetchSeasons()
      } else if (response.status === 409) {
        // Tournament already exists
        const result = await response.json()
        alert('A tournament already exists for this season. You can view it in the Tournaments tab.')
        setShowTournamentPrompt(null)
        fetchSeasons()
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        console.error('Tournament creation failed:', error)
        alert(`Failed to create tournament: ${error?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to create tournament:', error)
      alert('Failed to create tournament')
    } finally {
      setCreatingTournament(false)
    }
  }

  const handleArchiveSeason = async (season: Season) => {
    if (!isManager || season.status !== 'COMPLETED') return
    
    if (!confirm(`Are you sure you want to archive the season "${season.name}"? This will move it to the archived section.`)) {
      return
    }

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' })
      })

      if (response.ok) {
        const result = await response.json()
        fetchSeasons()
        alert(result.message || 'Season archived successfully!')
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        alert(error?.error || 'Failed to archive season')
      }
    } catch (error) {
      console.error('Failed to archive season:', error)
      alert('Failed to archive season')
    }
  }

  const handleStartSeason = async (season: Season) => {
    if (!isManager || season.status !== 'DRAFT') return
    
    if (!confirm(`Are you sure you want to start the season "${season.name}"? This will deactivate any other active seasons and reset standings.`)) {
      return
    }

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' })
      })

      if (response.ok) {
        const result = await response.json()
        // Reload all seasons to reflect the status changes
        fetchSeasons()
        alert(result.message || 'Season started successfully!')
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        alert(error?.error || 'Failed to start season')
      }
    } catch (error) {
      console.error('Failed to start season:', error)
      alert('Failed to start season')
    }
  }



  const generateSchedule = async (season: Season) => {
    if (!isManager || season.status !== 'DRAFT') return

    try {
      const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}/generate-schedule`, {
        method: 'POST'
      })

      if (response.ok) {
        alert('Schedule generated successfully!')
        fetchSeasons() // Refresh to get updated match count
      } else {
        let error: any = null
        try {
          const ct = response.headers.get('content-type') || ''
          error = ct.includes('application/json') ? await response.json() : { error: await response.text() }
        } catch {
          error = { error: `${response.status} ${response.statusText}` }
        }
        alert(error?.error || 'Failed to generate schedule')
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      alert('Failed to generate schedule')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scheduleType: 'ROUND_ROBIN',
      gamesPerOpponent: '',
      totalGamesPerTeam: '',
      startDate: '',
      endDate: '',
      hasTournament: false,
      tournamentName: '',
      selectedTeams: []
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-700 text-slate-200'
      case 'ACTIVE': return 'bg-green-900 text-green-200'
      case 'COMPLETED': return 'bg-blue-900 text-blue-200'
      case 'ARCHIVED': return 'bg-purple-900 text-purple-200'
      case 'CANCELLED': return 'bg-red-900 text-red-200'
      default: return 'bg-slate-700 text-slate-200'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  // If a season is selected, show the dashboard
  if (selectedSeason) {
    if (!selectedSeason.id) {
      console.error('Selected season has no ID:', selectedSeason)
      setSelectedSeason(null)
      return (
        <div className="text-center py-8 bg-slate-900 rounded-lg">
          <p className="text-red-400">Error: Invalid season selected</p>
          <button
            onClick={() => setSelectedSeason(null)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Seasons
          </button>
        </div>
      )
    }
    
    return (
      <SeasonDashboard
        league={league}
        seasonId={selectedSeason.id}
        isManager={isManager}
        onBack={() => setSelectedSeason(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Season Management</h2>
          <p className="text-slate-300">Manage seasons for {league.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-300">Show:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'current' | 'archived')}
              className="px-3 py-1 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="current">Current Seasons</option>
              <option value="archived">Archived Seasons</option>
              <option value="all">All Seasons</option>
            </select>
          </div>
          
          {isManager && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Create Season
            </button>
          )}
        </div>
      </div>

      {/* Create Season Form */}
      {showCreateForm && (
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-white">Create New Season</h3>
          <form onSubmit={handleCreateSeason} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Season Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  placeholder="e.g., Spring 2024"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Schedule Type *
                </label>
                <select
                  value={formData.scheduleType}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value as 'ROUND_ROBIN' | 'FIXED_GAMES' }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ROUND_ROBIN">Round Robin (Each team plays every other team)</option>
                  <option value="FIXED_GAMES">Fixed Games (Each team plays a set number of games)</option>
                </select>
              </div>
            </div>

            {formData.scheduleType === 'ROUND_ROBIN' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Games Per Opponent *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.gamesPerOpponent}
                  onChange={(e) => setFormData(prev => ({ ...prev, gamesPerOpponent: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  placeholder="How many times each team plays each other"
                  required
                />
              </div>
            )}

            {formData.scheduleType === 'FIXED_GAMES' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Total Games Per Team *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.totalGamesPerTeam}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalGamesPerTeam: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  placeholder="Number of games each team will play"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                rows={3}
                placeholder="Optional description for this season"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tournament Integration */}
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasTournament"
                  checked={formData.hasTournament}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasTournament: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-800"
                />
                <label htmlFor="hasTournament" className="ml-2 text-sm font-medium text-slate-300">
                  Plan Season-Ending Tournament
                </label>
              </div>
              
              {formData.hasTournament && (
                <input
                  type="text"
                  value={formData.tournamentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tournamentName: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  placeholder="Tournament name (e.g., Championship Playoffs)"
                  required
                />
              )}
            </div>

            {/* Team Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Teams *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-600 bg-slate-800 rounded-lg p-3">
                {league.teams && league.teams.length > 0 ? league.teams.map((team) => (
                  <label key={team.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedTeams.includes(team.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, selectedTeams: [...prev.selectedTeams, team.id] }))
                        } else {
                          setFormData(prev => ({ ...prev, selectedTeams: prev.selectedTeams.filter(id => id !== team.id) }))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-600 rounded bg-slate-700"
                    />
                    <span className="text-sm text-white">{team.name}</span>
                  </label>
                )) : (
                  <div key="no-teams" className="col-span-full text-center text-slate-400 py-4">
                    No teams available in this league
                  </div>
                )}
              </div>
              {formData.selectedTeams.length < 2 && (
                <p className="text-sm text-red-400 mt-1">Select at least 2 teams</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
                className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || formData.selectedTeams.length < 2}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {creating && <LoadingSpinner />}
                <span>{creating ? 'Creating...' : 'Create Season'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Seasons List */}
      <div className="space-y-4">
        {(() => {
          const filteredSeasons = seasons.filter(season => {
            if (statusFilter === 'current') {
              return season.status !== 'ARCHIVED'
            } else if (statusFilter === 'archived') {
              return season.status === 'ARCHIVED'
            }
            return true // 'all'
          })
          
          return filteredSeasons.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-700">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-white mb-2">No seasons yet</h3>
            <p className="text-slate-300 mb-4">
              {isManager 
                ? "Create your first season to start organizing league matches and tournaments."
                : "The league manager hasn't created any seasons yet."
              }
            </p>
          </div>
        ) : (
          filteredSeasons
            .filter(season => season && season.id) // Only render seasons with valid IDs
            .map((season) => (
            <div key={season.id} className="bg-slate-900 p-6 rounded-lg border border-slate-700 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{season.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(season.status)}`}>
                      {season.status}
                    </span>
                  </div>
                  {season.description && (
                    <p className="text-slate-300 mb-2">{season.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                    <span key={`${season.id}-start-date`}>📅 Starts: {season.startDate ? new Date(season.startDate).toLocaleDateString() : 'Not set'}</span>
                    {season.endDate && (
                      <span key={`${season.id}-end-date`}>🏁 Ends: {new Date(season.endDate).toLocaleDateString()}</span>
                    )}
                    <span key={`${season.id}-teams`}>👥 {season.seasonTeams?.length || 0} teams</span>
                    <span key={`${season.id}-matches`}>⚽ {season.seasonMatches?.length || 0} matches</span>
                    <span key={`${season.id}-schedule-type`}>🎮 {season.scheduleType === 'ROUND_ROBIN' ? `Round Robin (${season.gamesPerOpponent || 1}x)` : `${season.totalGamesPerTeam} games per team`}</span>
                    {season.tournament && (
                      <span key={`${season.id}-tournament`}>🏅 Tournament: {season.tournament.name}</span>
                    )}
                  </div>
                </div>
                
                {isManager && (
                  <div className="flex space-x-2">
                    {season.status === 'DRAFT' && (
                      <>
                        <button
                          key={`${season.id}-generate-schedule`}
                          onClick={() => generateSchedule(season)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Generate Schedule
                        </button>
                        <button
                          key={`${season.id}-start-season`}
                          onClick={() => handleStartSeason(season)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Start Season
                        </button>
                        <button
                          key={`${season.id}-delete-season`}
                          onClick={() => setShowDeleteModal(season)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {season.status === 'ACTIVE' && (
                      <button
                        key={`${season.id}-complete-season`}
                        onClick={() => handleCompleteSeason(season)}
                        className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Complete Season
                      </button>
                    )}
                    {season.status === 'COMPLETED' && (
                      <>
                        <button
                          key={`${season.id}-recalculate-standings`}
                          onClick={async () => {
                            if (!confirm('Recalculate standings from all completed matches?')) return
                            try {
                              const response = await fetch(`/api/leagues/${league.id}/seasons/${season.id}/recalculate-standings`, {
                                method: 'POST'
                              })
                              if (response.ok) {
                                const result = await response.json()
                                alert(result.message || 'Standings recalculated successfully!')
                                fetchSeasons()
                              } else {
                                const error = await response.json().catch(() => ({ error: response.statusText }))
                                console.error('Recalculate standings error:', error)
                                alert(`Failed to recalculate standings: ${error.error || 'Unknown error'}\n${error.details || ''}`)
                              }
                            } catch (error: any) {
                              console.error('Failed to recalculate standings:', error)
                              alert(`Failed to recalculate standings: ${error.message || 'Unknown error'}`)
                            }
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          📊 Recalculate Standings
                        </button>
                        <button
                          key={`${season.id}-create-tournament`}
                          onClick={() => {
                            setTournamentFormData({
                              name: `${season.name} Championship`,
                              startDate: new Date().toISOString().split('T')[0],
                              format: 'SINGLE_ELIMINATION'
                            })
                            setShowTournamentPrompt(season)
                          }}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                        >
                          🏆 Create Tournament
                        </button>
                        <button
                          key={`${season.id}-archive-season`}
                          onClick={() => handleArchiveSeason(season)}
                          className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-700"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    {season.status !== 'ARCHIVED' && (
                      <button
                        key={`${season.id}-view-manage-season`}
                        onClick={() => {
                          // Validate season object before selecting
                          if (season && season.id) {
                            setSelectedSeason(season)
                          } else {
                            console.error('Invalid season object:', season)
                            alert('Error: Invalid season data. Please refresh the page.')
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {season.status === 'ACTIVE' ? 'Manage' : 'View'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )})()}
      </div>

      {/* Tournament Creation Prompt Modal */}
      {showTournamentPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full border border-slate-700">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="text-4xl mr-3">🏆</div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Season Complete!</h3>
                  <p className="text-slate-300">Create a championship tournament?</p>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
                <p className="text-blue-100 text-sm">
                  🎯 <strong>Automatic Seeding:</strong> Teams will be seeded based on their final season standings.
                  Top-ranked teams will receive favorable matchups in the tournament bracket.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tournament Name *
                  </label>
                  <input
                    type="text"
                    value={tournamentFormData.name}
                    onChange={(e) => setTournamentFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Spring Championship"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tournament Format *
                  </label>
                  <select
                    value={tournamentFormData.format}
                    onChange={(e) => setTournamentFormData(prev => ({ ...prev, format: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SINGLE_ELIMINATION">Single Elimination (One loss and you're out)</option>
                    <option value="DOUBLE_ELIMINATION">Double Elimination (Two losses to be eliminated)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={tournamentFormData.startDate}
                    onChange={(e) => setTournamentFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                  <h4 className="font-medium text-white mb-2 flex items-center">
                    <span className="mr-2">📊</span>
                    Seeding Preview (Based on Season Standings)
                  </h4>
                  <p className="text-sm text-slate-400 mb-3">
                    Teams will be seeded from highest to lowest standing
                  </p>
                  {showTournamentPrompt.seasonStandings && showTournamentPrompt.seasonStandings.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {showTournamentPrompt.seasonStandings
                        .sort((a: any, b: any) => (b.wins - a.wins) || (b.pointsFor - a.pointsFor))
                        .map((standing: any, index: number) => (
                          <div key={standing.id} className="flex items-center justify-between bg-slate-800 rounded px-3 py-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg font-bold text-blue-400">#{index + 1}</span>
                              <span className="text-white">{standing.team?.name || 'Unknown Team'}</span>
                            </div>
                            <div className="text-sm text-slate-400">
                              {standing.wins}W - {standing.losses}L ({standing.pointsFor} pts)
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No standings data available</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTournamentPrompt(null)
                    alert('Season completed successfully!')
                  }}
                  className="px-4 py-2 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600"
                  disabled={creatingTournament}
                >
                  Skip Tournament
                </button>
                <button
                  onClick={handleCreateSeasonTournament}
                  disabled={creatingTournament || !tournamentFormData.name || !tournamentFormData.startDate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {creatingTournament && <LoadingSpinner />}
                  <span>{creatingTournament ? 'Creating...' : 'Create Tournament'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <ConfirmModal
          open={true}
          onCancel={() => setShowDeleteModal(null)}
          onConfirm={() => handleDeleteSeason(showDeleteModal)}
          title="Delete Season"
          message={`Are you sure you want to delete "${showDeleteModal.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  )
}