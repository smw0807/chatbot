import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import Anthropic from '@anthropic-ai/sdk';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatService {
  private sessions = new Map<string, ChatMessage[]>();
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  streamChat(sessionId: string, userMessage: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      const messages = this.sessions.get(sessionId) ?? [];
      messages.push({ role: 'user', content: userMessage });

      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages,
      });

      stream.on('text', (text) => {
        observer.next({ data: { text, done: false } });
      });

      stream
        .finalMessage()
        .then((message) => {
          const assistantContent =
            message.content[0].type === 'text' ? message.content[0].text : '';
          messages.push({ role: 'assistant', content: assistantContent });
          this.sessions.set(sessionId, messages);

          observer.next({ data: { text: '', done: true, sessionId } });
          observer.complete();
        })
        .catch((err) => observer.error(err));

      return () => stream.abort();
    });
  }
}
