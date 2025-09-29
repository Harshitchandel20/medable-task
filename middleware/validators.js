const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));

  return res.status(422).json({
    errors: extractedErrors,
  });
};

const registerValidation = () => {
  return [
    body('email').isEmail().withMessage('Must be a valid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  ];
};

const loginValidation = () => {
    return [
      body('password').notEmpty().withMessage('Password is required'),
      body().custom((value, { req }) => {
        if (!req.body.username && !req.body.email) {
          throw new Error('Username or email is required');
        }
        return true;
      }),
    ];
  };

const statusValidation = () => {
    return [
        body('status').isIn(['online', 'offline', 'away', 'busy']).withMessage('Invalid status'),
    ];
};

const messageValidation = () => {
    return [
        body('content').notEmpty().withMessage('Message content is required'),
    ];
};

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  statusValidation,
  messageValidation,
};
