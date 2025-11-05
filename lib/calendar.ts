// Utility functions for generating calendar files

export function generateICS(event: {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  url?: string
}) {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeText = (text: string) => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n')
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grudge App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `UID:${Date.now()}@grudgeapp.com`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    event.url ? `URL:${event.url}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n')

  return icsContent
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function getGoogleCalendarUrl(event: {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
}) {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.startTime)}/${formatDate(event.endTime)}`,
    details: event.description || '',
    location: event.location || ''
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function getOutlookWebUrl(event: {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
}) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
    body: event.description || '',
    location: event.location || ''
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function getYahooCalendarUrl(event: {
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
}) {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: formatDate(event.startTime),
    et: formatDate(event.endTime),
    desc: event.description || '',
    in_loc: event.location || ''
  })

  return `https://calendar.yahoo.com/?${params.toString()}`
}
