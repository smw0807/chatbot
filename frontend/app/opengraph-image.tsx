import { ImageResponse } from 'next/og';

export const alt = '송민우 포트폴리오 챗봇';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(135deg, #171717 0%, #292524 45%, #f59e0b 160%)',
          color: '#f5f5f4',
          padding: '56px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '820px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: '#fcd34d',
              }}
            >
              Portfolio Chatbot
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1,
                fontSize: 84,
                fontWeight: 700,
              }}
            >
              <span>Song Minu</span>
              <span style={{ color: '#fde68a' }}>Portfolio</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 32,
                lineHeight: 1.4,
                color: '#e7e5e4',
              }}
            >
              송민우의 경험, 기술 스택, 프로젝트를
              <br />
              질문으로 탐색하는 포트폴리오 챗봇
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 9999,
              padding: '14px 22px',
              fontSize: 24,
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            Frontend Developer
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '14px',
              flexWrap: 'wrap',
            }}
          >
            {['Vue.js', 'Nuxt.js 2', 'JavaScript', 'Node.js'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  borderRadius: 9999,
                  background: '#f5f5f4',
                  color: '#1c1917',
                  padding: '12px 20px',
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
              fontSize: 24,
              color: '#fde68a',
            }}
          >
            <span>chatbot-olive-gamma-96.vercel.app</span>
            <span style={{ color: '#d6d3d1' }}>Ask anything about Song Minu</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
