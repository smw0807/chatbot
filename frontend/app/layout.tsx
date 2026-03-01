import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '챗봇',
  description: '간단한 스트리밍 챗봇 UI',
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
