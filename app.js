require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const routes = require("./routes");
const app = express();

app.use(
  session({
    store: new (require("connect-pg-simple")(session))({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SECRET_KEY,
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: true,
      sameSite: "none",
      domain: ".pickinguptime.com",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

require("./config/passport");

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  next();
});
// app.use(
//   cors({
//     origin: "http://welcome.pickinguptime.com",
//     credentials: true,
//   })
// );

// app.use(function (req, res, next) {
//   res.header(
//     "Access-Control-Allow-Origin",
//     "https://front-final-project.herokuapp.com"
//   );
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   res.header("Access-Control-Allow-Credentials", true);
//   next();
// });

app.use(passport.initialize());
app.use(passport.session());

app.use(routes);

app.use((req, res, next) => {
  console.log(req.session);
  console.log(req.user);
  next();
});

app.listen(process.env.PORT);
