import Joi from 'joi';
import { RECEIPT_CATEGORIES, BUDGET_PERIODS, CURRENCIES } from './constants.js';

/**
 * Reusable validation schemas using Joi
 */

export const schemas = {
  // Auth
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  // Receipt
  createReceipt: Joi.object({
    merchant: Joi.string().min(1).max(255).required().messages({
      'any.required': 'Merchant name is required',
      'string.max': 'Merchant name must not exceed 255 characters',
    }),
    vendor: Joi.string().max(255), // Fallback if merchant not provided
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
    date: Joi.date().iso().required().messages({
      'date.iso': 'Date must be in ISO format',
      'any.required': 'Date is required',
    }),
    category: Joi.string().valid(...RECEIPT_CATEGORIES).optional(),
    currency: Joi.string().valid(...CURRENCIES).default('INR'),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        quantity: Joi.number().positive(),
        price: Joi.number(),
      })
    ).optional(),
    notes: Joi.string().max(1000).optional(),
    imageUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    isManualEntry: Joi.boolean().default(false),
  }),

  updateReceipt: Joi.object({
    merchant: Joi.string().min(1).max(255).optional(),
    amount: Joi.number().positive().optional(),
    date: Joi.date().iso().optional(),
    category: Joi.string().valid(...RECEIPT_CATEGORIES).optional(),
    currency: Joi.string().valid(...CURRENCIES).optional(),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        quantity: Joi.number().positive(),
        price: Joi.number(),
      })
    ).optional(),
    notes: Joi.string().max(1000).optional(),
    imageUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  // Settings
  updateSettings: Joi.object({
    monthlyBudget: Joi.number().positive().optional(),
    notificationsEnabled: Joi.boolean().optional(),
    darkMode: Joi.boolean().optional(),
  }),

  // Budget
  createBudget: Joi.object({
    category: Joi.string().valid(...RECEIPT_CATEGORIES).required(),
    amount: Joi.number().positive().required(),
    period: Joi.string().valid(...BUDGET_PERIODS).default('monthly'),
    alertEnabled: Joi.boolean().default(true),
    alertThreshold: Joi.number().min(0).max(100).default(80),
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().positive().default(1),
    limit: Joi.number().positive().default(20).max(100),
  }),
};

/**
 * Validate data against schema
 */
export const validate = (data: any, schema: Joi.ObjectSchema) => {
  const { value, error } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    throw {
      statusCode: 422,
      message: 'Validation error',
      details: messages,
    };
  }

  return value;
};
