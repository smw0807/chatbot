import type { Metadata } from 'next';
import './globals.css';

function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return 'https://chatbot-olive-gamma-96.vercel.app';
}

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: '송민우 포트폴리오 챗봇',
  description: '송민우의 경험과 기술을 질문으로 탐색하는 포트폴리오 챗봇',
  applicationName: 'Song Minu Portfolio Chatbot',
  keywords: [
    '송민우',
    '포트폴리오',
    '프론트엔드 개발자',
    'Vue.js',
    'Nuxt.js',
    '챗봇',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    title: '송민우 포트폴리오 챗봇',
    description: '송민우의 경험, 기술 스택, 프로젝트를 질문으로 탐색해보세요.',
    siteName: 'Song Minu Portfolio Chatbot',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: '송민우 포트폴리오 챗봇',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '송민우 포트폴리오 챗봇',
    description: '송민우의 경험, 기술 스택, 프로젝트를 질문으로 탐색해보세요.',
    images: ['/opengraph-image'],
  },
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
