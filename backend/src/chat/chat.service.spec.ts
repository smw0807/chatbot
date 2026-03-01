import { ChatService } from './chat.service';

describe('ChatService', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalApiUrl = process.env.ANTHROPIC_API_URL;
  const originalModel = process.env.ANTHROPIC_MODEL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
    process.env.ANTHROPIC_API_URL = originalApiUrl;
    process.env.ANTHROPIC_MODEL = originalModel;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('stores the completed assistant response in the session history', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
    process.env.ANTHROPIC_MODEL = 'claude-3-7-sonnet-latest';

    const service = new ChatService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: createSseStream([
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"답변"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ]),
    }) as typeof fetch;

    const chunks = await collectChunks(
      service.streamChat('session-1', '첫 질문'),
    );

    expect(chunks).toEqual([
      { text: '답변', done: false },
      { done: true, sessionId: 'session-1' },
    ]);
    expect(readSessions(service).get('session-1')).toEqual([
      { role: 'user', content: '첫 질문' },
      { role: 'assistant', content: '답변' },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.any(Object),
    );

    const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls;
    const requestInit = fetchCalls[0]?.[1];

    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01',
      }),
    );
  });

  it('does not persist the user message when the provider fails', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

    const service = new ChatService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: {
            message: 'Invalid API key',
          },
        }),
    }) as typeof fetch;

    await expect(
      collectChunks(service.streamChat('session-2', '실패 케이스')),
    ).rejects.toThrow('Invalid API key');
    expect(readSessions(service).has('session-2')).toBe(false);
  });
});

function readSessions(service: ChatService) {
  return (
    service as unknown as {
      sessions: Map<
        string,
        Array<{ role: 'user' | 'assistant'; content: string }>
      >;
    }
  ).sessions;
}

function createSseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function collectChunks<T>(stream$: {
  subscribe: (observer: {
    next: (value: T) => void;
    error: (error: unknown) => void;
    complete: () => void;
  }) => { unsubscribe: () => void };
}): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const values: T[] = [];

    stream$.subscribe({
      next: (value) => values.push(value),
      error: reject,
      complete: () => resolve(values),
    });
  });
}
