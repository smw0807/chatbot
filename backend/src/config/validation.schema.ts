import * as Joi from 'joi';

export const validationSchema = Joi.object({
  APP_PORT: Joi.number().required(),
  ANTHROPIC_API_KEY: Joi.string().required(),
  FRONTEND_URL: Joi.string().required(),
});
