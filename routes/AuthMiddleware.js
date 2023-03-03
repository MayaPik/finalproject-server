module.exports.isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log("auth");
    next();
  } else {
    console.log(" not auth");

    res
      .status(401)
      .json({ msg: "You are not authorized to view this resource" });
  }
};

module.exports.isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.adminid) {
    console.log("auth");
    next();
  } else {
    console.log(req.isAuthenticated());
    res.status(401).json({
      msg: "You are not authorized to view this resource because you are not an admin.",
    });
  }
};

module.exports.isGuide = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.guideid || req.user.adminid)) {
    console.log("auth");

    next();
  } else {
    console.log(req.isAuthenticated());

    res.status(401).json({
      msg: "You are not authorized to view this resource because you are not a guide.",
    });
  }
};
