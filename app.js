require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const routes = require("./routes");
const cookieParser = require("cookie-parser");

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({ origin: "https://welcome.pickinguptime.com", credentials: true })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    store: new (require("connect-pg-simple")(session))({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SECRET_KEY,
    saveUninitialized: false,
    resave: false,
    cookie: {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: true,
      domain: ".pickinguptime.com",
    },
  })
);

require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());
app.use(routes);

app.use((req, res, next) => {
  console.log(req.session);
  console.log(req.user);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

app.listen(process.env.PORT);
