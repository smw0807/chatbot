import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: process.env.APP_PORT || 3002,
  frontendUrl: process.env.FRONTEND_URL || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicApiUrl: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
}));
