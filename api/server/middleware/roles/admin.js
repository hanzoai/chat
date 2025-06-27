const { SystemRoles } = require('@hanzochat/data-provider');

function checkAdmin(req, res, next) {
  try {
    if (req.user.role !== SystemRoles.ADMIN) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  } catch (_error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

module.exports = checkAdmin;
