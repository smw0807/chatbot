import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: process.env.APP_PORT || 3002,
  frontendUrl: process.env.FRONTEND_URL || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiApiUrl: process.env.OPENAI_API_URL || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
}));
