import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  text?: string;
  done: boolean;
  sessionId?: string;
}

interface OpenAIInputMessage {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{
    type: 'input_text';
    text: string;
  }>;
}

interface OpenAIStreamEvent {
  type: string;
  delta?: string;
  error?: {
    message?: string;
  };
}

@Injectable()
export class ChatService {
  private sessions = new Map<string, ChatMessage[]>();

  constructor(private readonly configService: ConfigService) {}

  private getApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENAI_API_KEY is not configured',
      );
    }

    return apiKey;
  }

  private getModel(): string {
    return process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  }

  private getApiUrl(): string {
    const apiUrl = this.configService.get<string>('OPENAI_API_URL');

    if (!apiUrl) {
      throw new InternalServerErrorException(
        'OPENAI_API_URL is not configured',
      );
    }

    return apiUrl;
  }

  private toOpenAIInput(messages: ChatMessage[]): OpenAIInputMessage[] {
    return messages.map((message) => ({
      type: 'message',
      role: message.role,
      content: [
        {
          type: 'input_text',
          text: message.content,
        },
      ],
    }));
  }

  private async readErrorMessage(response: Response): Promise<string> {
    const fallback = `OpenAI request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };

      return payload.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }

  streamChat(sessionId: string, userMessage: string): Observable<StreamChunk> {
    return new Observable((observer) => {
      const previousMessages = this.sessions.get(sessionId) ?? [];
      const nextMessages = [
        ...previousMessages,
        { role: 'user' as const, content: userMessage },
      ];
      const abortController = new AbortController();
      let assistantContent = '';

      void (async () => {
        const response = await fetch(this.getApiUrl(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getApiKey()}`,
          },
          body: JSON.stringify({
            model: this.getModel(),
            input: this.toOpenAIInput(nextMessages),
            stream: true,
            max_output_tokens: 1024,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(await this.readErrorMessage(response));
        }

        if (!response.body) {
          throw new Error('OpenAI response body is missing');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const parsedEvent = this.parseSseEvent(event);

            if (!parsedEvent) {
              continue;
            }

            if (parsedEvent.type === 'response.output_text.delta') {
              const text = parsedEvent.delta ?? '';
              assistantContent += text;
              observer.next({ text, done: false });
            }

            if (parsedEvent.type === 'error') {
              throw new Error(
                parsedEvent.error?.message ?? 'OpenAI streaming failed',
              );
            }

            if (parsedEvent.type === 'response.completed') {
              this.sessions.set(sessionId, [
                ...nextMessages,
                { role: 'assistant', content: assistantContent },
              ]);
              observer.next({ done: true, sessionId });
              observer.complete();
              return;
            }
          }
        }

        throw new Error('OpenAI streaming ended before completion');
      })().catch((error: unknown) => {
        observer.error(
          error instanceof Error ? error : new Error('OpenAI request failed'),
        );
      });

      return () => abortController.abort();
    });
  }

  private parseSseEvent(rawEvent: string): OpenAIStreamEvent | null {
    const dataLines = rawEvent
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);

    if (dataLines.length === 0) {
      return null;
    }

    const payload = dataLines.join('\n');

    if (payload === '[DONE]') {
      return null;
    }

    return JSON.parse(payload) as OpenAIStreamEvent;
  }
}
