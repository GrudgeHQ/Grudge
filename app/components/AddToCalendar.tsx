"use client"
import React, { useState } from 'react'
import { generateICS, downloadICS, getGoogleCalendarUrl, getOutlookWebUrl, getYahooCalendarUrl } from '@/lib/calendar'

interface AddToCalendarProps {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  url?: string
}

export default function AddToCalendar({ title, description, location, startTime, endTime, url }: AddToCalendarProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const handleAppleCalendar = () => {
    const icsContent = generateICS({ title, description, location, startTime, endTime, url })
    downloadICS(icsContent, `${title.replace(/[^a-z0-9]/gi, '_')}.ics`)
    setShowDropdown(false)
  }

  const handleOutlook = () => {
    const icsContent = generateICS({ title, description, location, startTime, endTime, url })
    downloadICS(icsContent, `${title.replace(/[^a-z0-9]/gi, '_')}.ics`)
    setShowDropdown(false)
  }

  const handleGoogleCalendar = () => {
    const googleUrl = getGoogleCalendarUrl({ title, description, location, startTime, endTime })
    window.open(googleUrl, '_blank')
    setShowDropdown(false)
  }

  const handleOutlookWeb = () => {
    const outlookUrl = getOutlookWebUrl({ title, description, location, startTime, endTime })
    window.open(outlookUrl, '_blank')
    setShowDropdown(false)
  }

  const handleYahoo = () => {
    const yahooUrl = getYahooCalendarUrl({ title, description, location, startTime, endTime })
    window.open(yahooUrl, '_blank')
    setShowDropdown(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 active:bg-green-800 active:scale-95 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Add to Calendar
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-20">
            <div className="py-1">
              <button
                onClick={handleGoogleCalendar}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                Google Calendar
              </button>
              <button
                onClick={handleOutlookWeb}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v16h10V4H7zm2 2h6v2H9V6zm0 4h6v2H9v-2zm0 4h4v2H9v-2z"/>
                </svg>
                Outlook Web
              </button>
              <button
                onClick={handleOutlook}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                </svg>
                Outlook (Download)
              </button>
              <button
                onClick={handleAppleCalendar}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Apple Calendar
              </button>
              <button
                onClick={handleYahoo}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
                Yahoo Calendar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
