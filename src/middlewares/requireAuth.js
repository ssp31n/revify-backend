export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({
    success: false,
    message: "Unauthorized access. Please log in.",
  });
};
