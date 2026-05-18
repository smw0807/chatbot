export const runtime = 'edge';

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return new Response(
      JSON.stringify({ error: 'BACKEND_URL is not configured', done: true }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const body = await request.json();

  const response = await fetch(`${backendUrl}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: 'Backend error', done: true }),
      { status: response.status, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
