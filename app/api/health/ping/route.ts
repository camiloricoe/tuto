import { NextResponse } from 'next/server'

// Public, unauthenticated health probe used by the custom-domain verification
// flow (and any external uptime monitor). Returns a small JSON body so the
// caller can confirm both HTTP reachability *and* that they're hitting a
// TUTO deployment (not a parked page that returns 200).

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'tuto',
      time: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'cache-control': 'no-store, max-age=0',
      },
    },
  )
}
