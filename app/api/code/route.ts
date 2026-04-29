import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const HARDCODED_PASSWORD = process.env.APP_PASSWORD || 'reviewer2024';

function buildOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return client;
}

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractTextBody(payload: any): string {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractTextBody(part);
      if (text) return text;
    }
  }

  return '';
}

function extractCode(text: string): string | null {
  // Match 4–8 digit standalone codes (typical 2FA format)
  const match = text.match(/\b(\d{4,8})\b/);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.password !== HARDCODED_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (
    !process.env.GMAIL_CLIENT_ID ||
    !process.env.GMAIL_CLIENT_SECRET ||
    !process.env.GMAIL_REFRESH_TOKEN
  ) {
    return NextResponse.json({ error: 'Gmail credentials not configured.' }, { status: 500 });
  }

  try {
    const auth = buildOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    // Search for recent Google Voice forwarded SMS — adjust query if needed
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:txt.voice.google.com',
      maxResults: 1,
    });

    const messages = listRes.data.messages;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ code: null, snippet: '', timestamp: null });
    }

    const msgRes = await gmail.users.messages.get({
      userId: 'me',
      id: messages[0].id!,
      format: 'full',
    });

    const msg = msgRes.data;
    const bodyText = extractTextBody(msg.payload);
    const code = extractCode(bodyText);

    // Send a short snippet of the message for context (no PII beyond code)
    const snippet = bodyText.replace(/\s+/g, ' ').trim().substring(0, 120);
    const timestamp = msg.internalDate
      ? new Date(parseInt(msg.internalDate)).toISOString()
      : null;

    return NextResponse.json({ code, snippet, timestamp });
  } catch (err: any) {
    console.error('Gmail API error:', err?.message);
    return NextResponse.json(
      { error: 'Failed to fetch from Gmail. Check credentials.' },
      { status: 500 }
    );
  }
}
