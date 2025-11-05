"use client"
import React, { useState, useEffect } from 'react'

interface Team {
  id: string
  name: string
  sport: string
  inviteCode: string
  createdAt: string
  description?: string
  website?: string
  location?: string
  foundedYear?: number
  teamColors?: {
    primary: string
    secondary: string
  }
  members?: any[]
}

interface TeamProfileManagerProps {
  teamId: string
}

export default function TeamProfileManager({ teamId }: TeamProfileManagerProps) {
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  // Form fields
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [location, setLocation] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#3B82F6')
  const [secondaryColor, setSecondaryColor] = useState('#1E40AF')

  useEffect(() => {
    loadTeam()
  }, [teamId])

  const loadTeam = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${teamId}`)
      
      if (response.ok) {
        const data = await response.json()
        const teamData = data.team
        setTeam(teamData)
        
        // Populate form fields (temporarily only supporting name until database migration)
        setTeamName(teamData.name || '')
        // TODO: Enable after database migration:
        // setDescription(teamData.description || '')
        // setWebsite(teamData.website || '')
        // setLocation(teamData.location || '')
        // setFoundedYear(teamData.foundedYear ? teamData.foundedYear.toString() : '')
        // setPrimaryColor(teamData.teamColors?.primary || '#3B82F6')
        // setSecondaryColor(teamData.teamColors?.secondary || '#1E40AF')
      } else {
        setMessage('Failed to load team information')
      }
    } catch (error) {
      console.error('Error loading team:', error)
      setMessage('Error loading team information')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!teamName.trim()) {
      setMessage('Team name is required')
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const updateData = {
        name: teamName.trim()
        // TODO: Enable after database migration:
        // description: description.trim() || null,
        // website: website.trim() || null,
        // location: location.trim() || null,
        // foundedYear: foundedYear ? parseInt(foundedYear) : null,
        // teamColors: {
        //   primary: primaryColor,
        //   secondary: secondaryColor
        // }
      }

      const response = await fetch(`/api/teams/${teamId}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const data = await response.json()
        setTeam(data.team)
        setMessage('Team profile updated successfully!')
        
        // Clear success message after 5 seconds
        setTimeout(() => setMessage(null), 5000)
      } else {
        const errorData = await response.json()
        setMessage(errorData.error || 'Failed to update team profile')
      }
    } catch (error) {
      console.error('Error updating team:', error)
      setMessage('Error updating team profile')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!team) return
    
    setTeamName(team.name || '')
    // TODO: Enable after database migration:
    // setDescription(team.description || '')
    // setWebsite(team.website || '')
    // setLocation(team.location || '')
    // setFoundedYear(team.foundedYear ? team.foundedYear.toString() : '')
    // setPrimaryColor(team.teamColors?.primary || '#3B82F6')
    // setSecondaryColor(team.teamColors?.secondary || '#1E40AF')
    setMessage(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-400">Loading team information...</span>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-lg mb-2">❌ Error</div>
        <div className="text-gray-400">Failed to load team information</div>
        <button
          onClick={loadTeam}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.includes('successfully') 
            ? 'bg-green-500/20 border border-green-500 text-green-100' 
            : 'bg-red-500/20 border border-red-500 text-red-100'
        }`}>
          {message}
        </div>
      )}

      {/* Team Preview */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: primaryColor }}
          >
            {teamName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{teamName || 'Team Name'}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <span className="capitalize">{team.sport}</span>
              {location && (
                <>
                  <span>•</span>
                  <span>📍 {location}</span>
                </>
              )}
              {foundedYear && (
                <>
                  <span>•</span>
                  <span>Est. {foundedYear}</span>
                </>
              )}
            </div>
            {description && (
              <p className="text-gray-400 text-sm mt-2">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Team Information</h3>
        
        <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500 rounded">
          <p className="text-blue-100 text-sm">
            📝 Currently only team name changes are supported. Additional profile fields (description, website, etc.) will be available after the next system update.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Team Name *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                placeholder="Enter team name"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Description <span className="text-xs text-blue-400">(Coming Soon)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled
                className="w-full px-4 py-2 bg-slate-600 border border-slate-600 rounded-lg text-gray-400 resize-none cursor-not-allowed opacity-50"
                rows={3}
                placeholder="Brief description of your team... (Available after next update)"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Location <span className="text-xs text-blue-400">(Coming Soon)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled
                className="w-full px-4 py-2 bg-slate-600 border border-slate-600 rounded-lg text-gray-400 cursor-not-allowed opacity-50"
                placeholder="City, State (Available after next update)"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Website <span className="text-xs text-blue-400">(Coming Soon)</span>
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled
                className="w-full px-4 py-2 bg-slate-600 border border-slate-600 rounded-lg text-gray-400 cursor-not-allowed opacity-50"
                placeholder="https://yourteamwebsite.com (Available after next update)"
              />
            </div>
          </div>

          {/* Team Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Founded Year <span className="text-xs text-blue-400">(Coming Soon)</span>
              </label>
              <input
                type="number"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                disabled
                className="w-full px-4 py-2 bg-slate-600 border border-slate-600 rounded-lg text-gray-400 cursor-not-allowed opacity-50"
                placeholder="2024 (Available after next update)"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Team Colors <span className="text-xs text-blue-400">(Coming Soon)</span>
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled
                      className="w-12 h-8 rounded border border-slate-600 bg-slate-600 cursor-not-allowed opacity-50"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled
                      className="flex-1 px-3 py-1 bg-slate-600 border border-slate-600 rounded text-gray-400 text-sm cursor-not-allowed opacity-50"
                      placeholder="#3B82F6 (Available after next update)"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Secondary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      disabled
                      className="w-12 h-8 rounded border border-slate-600 bg-slate-600 cursor-not-allowed opacity-50"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      disabled
                      className="flex-1 px-3 py-1 bg-slate-600 border border-slate-600 rounded text-gray-400 text-sm cursor-not-allowed opacity-50"
                      placeholder="#1E40AF (Available after next update)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Team Stats */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Team Stats</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Sport:</span>
                  <div className="text-white font-medium capitalize">{team.sport}</div>
                </div>
                <div>
                  <span className="text-gray-400">Members:</span>
                  <div className="text-white font-medium">{team.members?.length || 0}</div>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <div className="text-white font-medium">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Invite Code:</span>
                  <div className="text-blue-400 font-mono text-xs">{team.inviteCode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-600">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !teamName.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}