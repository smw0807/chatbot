import * as Joi from 'joi';

export const validationSchema = Joi.object({
  APP_PORT: Joi.number().required(),
  ANTHROPIC_API_KEY: Joi.string().required(),
  ANTHROPIC_API_URL: Joi.string()
    .uri()
    .default('https://api.anthropic.com/v1/messages'),
  ANTHROPIC_MODEL: Joi.string().default('claude-3-7-sonnet-latest'),
  FRONTEND_URL: Joi.string().uri().required(),
});
