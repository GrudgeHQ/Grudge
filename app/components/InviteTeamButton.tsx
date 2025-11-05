'use client'

import { useState } from 'react'

interface InviteTeamButtonProps {
  teamName: string
  inviteCode: string
}

export default function InviteTeamButton({ teamName, inviteCode }: InviteTeamButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${window.location.origin}/teams/join?code=${inviteCode}`
  const inviteMessage = `Join "${teamName}" on Grudge App!\n\nTeam: ${teamName}\nInvite Code: ${inviteCode}\nLink: ${inviteUrl}`

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareInvite = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${teamName}`,
        text: inviteMessage,
        url: inviteUrl
      })
    } else {
      copyToClipboard(inviteMessage)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg font-medium text-sm shadow-lg hover:shadow-green-500/20 active:scale-95 transition-all duration-200 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
        Invite to Team
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Invite to {teamName}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Team Info */}
              <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                <p className="text-sm text-gray-300 mb-1">Team Name</p>
                <p className="text-white font-medium">{teamName}</p>
              </div>

              {/* Invite Code */}
              <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-300">Invite Code</p>
                  <button
                    onClick={() => copyToClipboard(inviteCode)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-white font-mono text-lg tracking-wider">{inviteCode}</p>
              </div>

              {/* Invite URL */}
              <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-300">Invite Link</p>
                  <button
                    onClick={() => copyToClipboard(inviteUrl)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-white text-sm break-all">{inviteUrl}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={shareInvite}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium text-sm shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share Invite
                </button>
                <button
                  onClick={() => copyToClipboard(inviteMessage)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg font-medium text-sm shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Details
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
              <p className="text-blue-400 text-xs">
                💡 Share the invite code or link with others to let them join your team instantly!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}