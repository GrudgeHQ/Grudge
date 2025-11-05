// This file prevents Next.js from trying to handle missing icon routes
// which were causing 404s and extra compilation overhead

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}
