import { ChatService } from './chat.service';

describe('ChatService', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_MODEL = originalModel;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('stores the completed assistant response in the session history', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-4.1-mini';

    const service = new ChatService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: createSseStream([
        'data: {"type":"response.output_text.delta","delta":"답변"}\n\n',
        'data: {"type":"response.completed"}\n\n',
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
      'https://api.openai.com/v1/responses',
      expect.any(Object),
    );

    const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls;
    const requestInit = fetchCalls[0]?.[1];

    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer test-key',
      }),
    );
  });

  it('does not persist the user message when the provider fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

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
