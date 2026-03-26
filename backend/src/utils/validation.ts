import Joi from 'joi';
import { RECEIPT_CATEGORIES, BUDGET_PERIODS, CURRENCIES } from './constants.js';

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required',
      }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({ 'any.required': 'Current password is required' }),
    newPassword: Joi.string().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters',
        'string.pattern.base': 'New password must contain uppercase, lowercase, and a number',
        'any.required': 'New password is required',
      }),
  }),

  createReceipt: Joi.object({
    merchant: Joi.string().min(1).max(255).required(),
    vendor: Joi.string().max(255),
    amount: Joi.number().positive().required(),
    date: Joi.date().iso().required(),
    category: Joi.string().valid(...RECEIPT_CATEGORIES).optional(),
    currency: Joi.string().valid(...CURRENCIES).default('INR'),
    items: Joi.array().items(
      Joi.object({ name: Joi.string().required(), quantity: Joi.number().positive(), price: Joi.number() })
    ).optional(),
    notes: Joi.string().max(1000).allow('').optional(),
    imageUrl: Joi.string().allow('').optional(),
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
      Joi.object({ name: Joi.string().required(), quantity: Joi.number().positive(), price: Joi.number() })
    ).optional(),
    notes: Joi.string().max(1000).allow('').optional(),
    imageUrl: Joi.string().allow('').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  updateSettings: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    monthlyBudget: Joi.number().positive().optional(),
    notificationsEnabled: Joi.boolean().optional(),
    darkMode: Joi.boolean().optional(),
  }),

  createBudget: Joi.object({
    category: Joi.string().valid(...RECEIPT_CATEGORIES).required(),
    amount: Joi.number().positive().required(),
    period: Joi.string().valid(...BUDGET_PERIODS).default('monthly'),
    alertEnabled: Joi.boolean().default(true),
    alertThreshold: Joi.number().min(0).max(100).default(80),
  }),
};
