// middleware/authorizeRole.js
const isAdmin = (req, res, next) => {
  if (req.role === 'admin') {
    return next();
  }
  return res.status(403).send({ message: "Require Admin Role!" });
};

const isStaff = (req, res, next) => {
  if (req.role === 'admin' || req.role === 'staff') {
    return next();
  }
  return res.status(403).send({ message: "Require Staff or Admin Role!" });
};

// Untuk isViewer, kita hanya perlu token yang valid. Jadi, cukup gunakan verifyToken saja.

const auth = {
  isAdmin,
  isStaff
};

module.exports = auth;