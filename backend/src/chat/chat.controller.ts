import { Controller, Get, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Sse('stream')
  stream(
    @Query('message') message: string,
    @Query('sessionId') sessionId?: string,
  ): Observable<MessageEvent> {
    const id = sessionId ?? crypto.randomUUID();
    return this.chatService.streamChat(id, message);
  }
}
