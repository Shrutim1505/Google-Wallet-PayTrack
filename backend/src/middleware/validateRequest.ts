import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler.js';

type SchemaType = 'body' | 'params' | 'query';

export const validateRequest = (schema: Joi.ObjectSchema, schemaType: SchemaType = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req[schemaType], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(AppError.validation(errors));
    }

    req[schemaType] = value;
    next();
  };
};
