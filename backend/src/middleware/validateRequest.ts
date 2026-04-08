import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger.js';

/**
 * Middleware factory to validate request body, params, or query
 */
export const validateRequest = (
  schema: Joi.ObjectSchema,
  schemaType: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[schemaType];

    const { value, error } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      logger.debug({
        message: 'Validation error',
        schemaType,
        errors: error.details,
      });

      const messages = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      return res.status(422).json({
        success: false,
        error: 'Validation error',
        details: messages,
        timestamp: new Date(),
      });
    }

    // Replace original with validated value
    req[schemaType] = value;
    next();
  };
};
