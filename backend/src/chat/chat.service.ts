import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Observable } from 'rxjs';
import Anthropic from '@anthropic-ai/sdk';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamChunk {
  text?: string;
  done: boolean;
  sessionId?: string;
}

@Injectable()
export class ChatService {
  private sessions = new Map<string, ChatMessage[]>();

  private getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    return new Anthropic({ apiKey });
  }

  streamChat(sessionId: string, userMessage: string): Observable<StreamChunk> {
    return new Observable((observer) => {
      const previousMessages = this.sessions.get(sessionId) ?? [];
      const nextMessages = [
        ...previousMessages,
        { role: 'user' as const, content: userMessage },
      ];

      const stream = this.getClient().messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: nextMessages,
      });

      stream.on('text', (text) => {
        observer.next({ text, done: false });
      });

      stream
        .finalMessage()
        .then((message) => {
          const assistantContent =
            message.content[0].type === 'text' ? message.content[0].text : '';
          this.sessions.set(sessionId, [
            ...nextMessages,
            { role: 'assistant', content: assistantContent },
          ]);

          observer.next({ done: true, sessionId });
          observer.complete();
        })
        .catch((err) => observer.error(err));

      return () => stream.abort();
    });
  }
}
