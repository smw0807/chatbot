'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const API_URL = process.env.API_URL;
console.log(API_URL);
if (!API_URL) {
  throw new Error('API_URL is not set');
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const userMessage = input.trim();
    if (!userMessage || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', streaming: true },
    ]);

    const params = new URLSearchParams({ message: userMessage });
    if (sessionId) params.set('sessionId', sessionId);

    const eventSource = new EventSource(
      `${API_URL}/chat/stream?${params.toString()}`
    );

    eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        text: string;
        done: boolean;
        sessionId?: string;
      };

      if (data.done) {
        if (data.sessionId) setSessionId(data.sessionId);
        setMessages((prev) =>
          prev.map((msg, i) =>
            i === prev.length - 1 ? { ...msg, streaming: false } : msg
          )
        );
        setIsStreaming(false);
        eventSource.close();
        inputRef.current?.focus();
      } else {
        setMessages((prev) =>
          prev.map((msg, i) =>
            i === prev.length - 1
              ? { ...msg, content: msg.content + data.text }
              : msg
          )
        );
      }
    };

    eventSource.onerror = () => {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1
            ? {
                ...msg,
                content: '오류가 발생했습니다. 다시 시도해주세요.',
                streaming: false,
              }
            : msg
        )
      );
      setIsStreaming(false);
      eventSource.close();
    };
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 shadow-sm flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">챗봇</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-24 text-sm">
            무엇이든 물어보세요
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-[2px] h-4 ml-0.5 bg-current align-middle animate-pulse" />
                )}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4 flex-shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="메시지를 입력하세요..."
            disabled={isStreaming}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
