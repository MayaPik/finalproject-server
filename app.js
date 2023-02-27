require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const routes = require("./routes");
const app = express();
const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(
  session({
    store: new (require("connect-pg-simple")(session))({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SECRET_KEY,
    saveUninitialized: true,
    resave: true,
    cookie: {
      domain: ".netlify.app",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      secure: true,
      httpOnly: false,
      path: "/",
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
require("./config/passport");

app.use(
  cors({
    origin: "https://incredible-sable-62c82c.netlify.app",
    credentials: true,
  })
);

// app.use(function (req, res, next) {
//   res.header(
//     "Access-Control-Allow-Origin",
//     "https://incredible-sable-62c82c.netlify.app"
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

app.use((req, res, next) => {
  console.log(req.session);
  console.log(req.user);
  next();
});
app.use(routes);

app.listen(process.env.PORT);
