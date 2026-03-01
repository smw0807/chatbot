import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Song Minu Portfolio Chatbot',
  description: '송민우의 경험과 기술을 질문으로 탐색하는 포트폴리오 챗봇',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
