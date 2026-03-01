import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: process.env.APP_PORT || 3002,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
}));
