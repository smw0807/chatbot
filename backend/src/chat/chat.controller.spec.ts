import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: {
    streamChat: jest.Mock;
  };

  beforeEach(async () => {
    chatService = {
      streamChat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: chatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('rejects an empty message', async () => {
    const { response } = createResponse();

    await expect(
      controller.stream({ message: '   ' }, response),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('streams ndjson chunks to the response', async () => {
    chatService.streamChat.mockReturnValue(
      new Observable((observer) => {
        observer.next({ text: '안녕', done: false });
        observer.next({ done: true, sessionId: 'session-1' });
        observer.complete();
      }),
    );

    const { response, mocks } = createResponse();

    await controller.stream({ message: '안녕하세요' }, response);

    expect(chatService.streamChat).toHaveBeenCalledWith(
      expect.any(String),
      '안녕하세요',
    );
    expect(mocks.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/x-ndjson; charset=utf-8',
    );
    expect(mocks.write).toHaveBeenCalledWith(
      `${JSON.stringify({ text: '안녕', done: false })}\n`,
    );
    expect(mocks.write).toHaveBeenCalledWith(
      `${JSON.stringify({ done: true, sessionId: 'session-1' })}\n`,
    );
    expect(mocks.end).toHaveBeenCalled();
  });
});

function createResponse(): {
  response: Response;
  mocks: {
    setHeader: jest.Mock;
    status: jest.Mock;
    write: jest.Mock;
    end: jest.Mock;
    on: jest.Mock;
  };
} {
  const listeners = new Map<string, () => void>();
  const mocks = {
    setHeader: jest.fn(),
    status: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };

  mocks.status.mockReturnValue(mocks);
  mocks.on.mockImplementation((event: string, handler: () => void) => {
    listeners.set(event, handler);
    return mocks;
  });

  return {
    response: {
      headersSent: false,
      ...mocks,
    } as unknown as Response,
    mocks,
  };
}
