module.exports = function (req, res, next) {
  const user = req.cookies.connectcid;
  req.user = user;
  next();
};
