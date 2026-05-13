import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler.js';

/**
 * Middleware factory to validate request body, params, or query.
 * Throws AppError.validation — caught by global error handler which returns RFC 7807.
 */
export const validateRequest = (
  schema: Joi.ObjectSchema,
  schemaType: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const dataToValidate = req[schemaType];

    const { value, error } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(AppError.validation(errors));
    }

    req[schemaType] = value;
    next();
  };
};
