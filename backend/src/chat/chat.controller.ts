import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  async stream(@Body() body: ChatDto, @Res() res: Response): Promise<void> {
    const message = body.message?.trim();

    if (!message) {
      throw new BadRequestException('message is required');
    }

    const sessionId = body.sessionId?.trim() || randomUUID();

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    await new Promise<void>((resolve, reject) => {
      const stream = this.chatService.streamChat(sessionId, message).subscribe({
        next: (chunk) => {
          res.write(`${JSON.stringify(chunk)}\n`);
        },
        error: (error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'streaming failed';

          if (!res.headersSent) {
            res.status(500);
          }

          res.write(`${JSON.stringify({ error: errorMessage, done: true })}\n`);
          res.end();
          reject(
            error instanceof Error ? error : new Error('streaming failed'),
          );
        },
        complete: () => {
          res.end();
          resolve();
        },
      });

      res.on('close', () => {
        stream.unsubscribe();
        resolve();
      });
    });
  }
}
