import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'LINE Webhook is online and ready' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const events = body.events || [];

    // Successfully acknowledge LINE webhook events
    console.log('Received LINE webhook events count:', events.length);

    return NextResponse.json({ success: true, count: events.length }, { status: 200 });
  } catch (err) {
    console.error('LINE webhook error:', err);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
