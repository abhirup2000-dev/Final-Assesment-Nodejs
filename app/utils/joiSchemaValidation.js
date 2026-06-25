const Joi = require('joi');

const registerSchema = Joi.object({
  userName: Joi.string().min(3).max(30).required().messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 30 characters'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

const blogSchema = Joi.object({
  title: Joi.string().min(5).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 5 characters'
  }),
  content: Joi.string().min(20).required().messages({
    'string.empty': 'Content is required',
    'string.min': 'Content must be at least 20 characters'
  }),
  excerpt: Joi.string().required().messages({
    'string.empty': 'Excerpt is required'
  }),
  category: Joi.string().required().messages({
    'string.empty': 'Category is required'
  })
});

const updateBlogSchema = Joi.object({
  title: Joi.string().min(5).optional(),
  content: Joi.string().min(20).optional(),
  excerpt: Joi.string().optional(),
  category: Joi.string().optional()
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'New password must be at least 6 characters long'
  })
});

const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required().messages({
    'string.empty': 'OTP is required',
    'string.length': 'OTP must be exactly 6 characters'
  })
});

const commentSchema = Joi.object({
  content: Joi.string().required().messages({
    'string.empty': 'Comment content is required'
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  blogSchema,
  updateBlogSchema,
  changePasswordSchema,
  otpSchema,
  commentSchema
};