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

interface AnthropicInputMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicStreamEvent {
  type: string;
  delta?: {
    type?: string;
    text?: string;
  };
  error?: {
    message?: string;
  };
}

@Injectable()
export class ChatService {
  private sessions = new Map<string, ChatMessage[]>();

  constructor(private readonly configService?: ConfigService) {}

  private getConfigValue(key: string): string | undefined {
    return this.configService?.get<string>(key) ?? process.env[key];
  }

  private getApiKey(): string {
    const apiKey = this.getConfigValue('ANTHROPIC_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    return apiKey;
  }

  private getModel(): string {
    return this.getConfigValue('ANTHROPIC_MODEL') ?? 'claude-3-7-sonnet-latest';
  }

  private getApiUrl(): string {
    const apiUrl =
      this.getConfigValue('ANTHROPIC_API_URL') ??
      'https://api.anthropic.com/v1/messages';

    if (!apiUrl) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_URL is not configured',
      );
    }

    return apiUrl;
  }

  private toAnthropicInput(messages: ChatMessage[]): AnthropicInputMessage[] {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  private async readErrorMessage(response: Response): Promise<string> {
    const fallback = `Anthropic request failed with status ${response.status}`;

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
            'anthropic-version': '2023-06-01',
            'x-api-key': this.getApiKey(),
          },
          body: JSON.stringify({
            model: this.getModel(),
            messages: this.toAnthropicInput(nextMessages),
            stream: true,
            max_tokens: 1024,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(await this.readErrorMessage(response));
        }

        if (!response.body) {
          throw new Error('Anthropic response body is missing');
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

            if (
              parsedEvent.type === 'content_block_delta' &&
              parsedEvent.delta?.type === 'text_delta'
            ) {
              const text = parsedEvent.delta.text ?? '';
              assistantContent += text;
              observer.next({ text, done: false });
            }

            if (parsedEvent.type === 'error') {
              throw new Error(
                parsedEvent.error?.message ?? 'Anthropic streaming failed',
              );
            }

            if (parsedEvent.type === 'message_stop') {
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

        throw new Error('Anthropic streaming ended before completion');
      })().catch((error: unknown) => {
        observer.error(
          error instanceof Error ? error : new Error('Anthropic request failed'),
        );
      });

      return () => abortController.abort();
    });
  }

  private parseSseEvent(rawEvent: string): AnthropicStreamEvent | null {
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

    return JSON.parse(payload) as AnthropicStreamEvent;
  }
}
