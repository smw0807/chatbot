import { ChatService } from './chat.service';

interface ChatSessionMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MockAnthropicClient {
  messages: {
    stream: jest.Mock;
  };
}

type ChatServiceInternals = {
  getClient: () => MockAnthropicClient;
  sessions: Map<string, ChatSessionMessage[]>;
};

describe('ChatService', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
    jest.restoreAllMocks();
  });

  it('stores the completed assistant response in the session history', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const service = new ChatService();
    const serviceWithInternals = service as unknown as ChatServiceInternals;
    const streamHandlers = new Map<string, (value: string) => void>();

    jest.spyOn(serviceWithInternals, 'getClient').mockReturnValue({
      messages: {
        stream: jest.fn().mockImplementation(({ messages }) => ({
          on: (event: string, handler: (value: string) => void) => {
            streamHandlers.set(event, handler);
          },
          finalMessage: () => {
            expect(messages).toEqual([{ role: 'user', content: '첫 질문' }]);
            streamHandlers.get('text')?.('답변');
            return Promise.resolve({
              content: [{ type: 'text', text: '답변 완료' }],
            });
          },
          abort: jest.fn(),
        })),
      },
    });

    const chunks = await collectChunks(
      service.streamChat('session-1', '첫 질문'),
    );

    expect(chunks).toEqual([
      { text: '답변', done: false },
      { done: true, sessionId: 'session-1' },
    ]);
    expect(serviceWithInternals.sessions.get('session-1')).toEqual([
      { role: 'user', content: '첫 질문' },
      { role: 'assistant', content: '답변 완료' },
    ]);
  });

  it('does not persist the user message when the provider fails', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    const service = new ChatService();
    const serviceWithInternals = service as unknown as ChatServiceInternals;

    jest.spyOn(serviceWithInternals, 'getClient').mockReturnValue({
      messages: {
        stream: jest.fn().mockReturnValue({
          on: jest.fn(),
          finalMessage: () => Promise.reject(new Error('provider failed')),
          abort: jest.fn(),
        }),
      },
    });

    await expect(
      collectChunks(service.streamChat('session-2', '실패 케이스')),
    ).rejects.toThrow('provider failed');
    expect(serviceWithInternals.sessions.has('session-2')).toBe(false);
  });
});

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
