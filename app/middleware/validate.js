const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    
    if (error) {
      console.error("Validation Error:", error.details.map(d => d.message));
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      req.flash('error', errorMessage);
      
      const referer = req.get('Referrer');
      if (referer) {
        return res.redirect(referer);
      }
      
      // Fallbacks if referer is missing
      if (req.originalUrl.includes('/admin')) return res.redirect('/admin/dashboard');
      if (req.originalUrl.includes('/user')) return res.redirect('/user/home');
      return res.redirect('/');
    }
    
    next();
  };
};

module.exports = validate;
