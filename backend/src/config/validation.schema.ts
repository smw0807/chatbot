import * as Joi from 'joi';

export const validationSchema = Joi.object({
  APP_PORT: Joi.number().required(),
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default('gpt-4.1-mini'),
  FRONTEND_URL: Joi.string().required(),
});
