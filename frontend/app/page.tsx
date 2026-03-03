'use client';

import {useEffect, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';
const SUGGESTED_QUESTIONS = [
  '송민우는 어떤 개발자인가요?',
  '주력 기술 스택이 뭐예요?',
  '블로그와 GitHub 링크를 알려줘',
  '어떤 프로젝트를 해왔나요?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const sendMessage = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage ?? input).trim();
    if (!userMessage || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    setMessages((prev) => [
      ...prev,
      {role: 'user', content: userMessage},
      {role: 'assistant', content: '', streaming: true},
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const setErrorState = () => {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1
            ? {
                ...msg,
                content: '오류가 발생했습니다. 다시 시도해주세요.',
                streaming: false,
              }
            : msg,
        ),
      );
    };

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const {value, done} = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const data = JSON.parse(line) as {
            text?: string;
            done?: boolean;
            sessionId?: string;
            error?: string;
          };

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.done) {
            if (data.sessionId) {
              setSessionId(data.sessionId);
            }

            setMessages((prev) =>
              prev.map((msg, i) =>
                i === prev.length - 1 ? {...msg, streaming: false} : msg,
              ),
            );
            setIsStreaming(false);
            inputRef.current?.focus();
            abortControllerRef.current = null;
            return;
          }

          if (data.text) {
            setMessages((prev) =>
              prev.map((msg, i) =>
                i === prev.length - 1
                  ? {...msg, content: msg.content + data.text}
                  : msg,
              ),
            );
          }
        }
      }

      throw new Error('Streaming ended unexpectedly');
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }

      setErrorState();
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,214,153,0.28),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(160,198,255,0.24),_transparent_32%),linear-gradient(135deg,_#f7f2e8_0%,_#f3efe7_48%,_#ebe4d7_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-stone-900/10 bg-stone-950 px-6 py-7 text-stone-100 shadow-[0_25px_80px_rgba(28,25,23,0.18)]">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">
            Portfolio Chatbot
          </p>
          <h1 className="mt-4 text-4xl leading-none font-semibold sm:text-5xl">
            Song
            <br />
            Minwoo
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-stone-300">
            송민우에 대한 정보를 질문하면 답하는 포트폴리오 챗봇입니다. 현재
            공개 프로필을 기준으로 응답하며, 제공되지 않은 내용은 추측하지
            않습니다.
          </p>

          <div className="mt-8 space-y-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-400">
              Verified
            </p>
            <div>
              <p className="text-sm text-stone-400">Focus</p>
              <p className="text-base">Frontend-oriented web development</p>
            </div>
            <div>
              <p className="text-sm text-stone-400">Core stack</p>
              <p className="text-base">
                Vue.js, Nuxt.js, JavaScript, Node.js, Tailwind CSS, React,
                Next.js, Nest.js TypeScript
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-400">Contact</p>
              <p className="text-base break-all">smw0807@gmail.com</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-400">
              Try asking
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  disabled={isStreaming || !API_URL}
                  className="rounded-full border border-white/10 bg-white/7 px-3 py-2 text-left text-sm text-stone-200 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60">
                  {question}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-[2rem] border border-stone-900/10 bg-white/70 shadow-[0_20px_70px_rgba(120,113,108,0.15)] backdrop-blur">
          <header className="border-b border-stone-900/8 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                  Ask about
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-900">
                  송민우의 경험과 기술
                </h2>
              </div>
              <div className="rounded-full border border-stone-900/10 bg-stone-100 px-3 py-1 text-xs text-stone-600">
                {isStreaming ? '답변 생성 중' : '대화 가능'}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center">
                <div className="max-w-2xl rounded-[1.75rem] border border-stone-900/10 bg-stone-50/90 p-6">
                  <p className="text-sm leading-7 text-stone-700">
                    예시: 주력 기술, 진행한 프로젝트, 어떤 개발자인지, 연락처,
                    블로그, GitHub 같은 질문을 해보세요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                    <div
                      className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm leading-7 sm:max-w-[75%] ${
                        msg.role === 'user'
                          ? 'bg-stone-950 text-stone-50'
                          : 'border border-stone-900/10 bg-white text-stone-800'
                      }`}>
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm prose-stone max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({href, children}) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-600 underline hover:text-amber-500">
                                  {children}
                                </a>
                              ),
                            }}>
                            {msg.content}
                          </ReactMarkdown>
                          {msg.streaming && (
                            <span className="ml-1 inline-block h-4 w-[2px] animate-pulse align-middle bg-current" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-stone-900/8 bg-white/85 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
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
                placeholder="송민우에 대해 질문해보세요"
                disabled={isStreaming}
                className="flex-1 rounded-[1.15rem] border border-stone-900/12 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
              />
              <button
                onClick={() => sendMessage()}
                disabled={isStreaming || !input.trim()}
                className="rounded-[1.15rem] bg-amber-500 px-5 py-3 text-sm font-medium text-stone-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
                전송
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
