require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const routes = require("./routes");

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({ origin: "https://welcome.pickinguptime.com", credentials: true })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    store: new (require("connect-pg-simple")(session))({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SECRET_KEY,
    saveUninitialized: true,
    resave: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: true,
      domain: ".pickinguptime.com",
    },
    proxy: true,
  })
);

require("./config/passport");

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log(req.session);
  if (req.isAuthenticated()) {
    console.log(req.user);
  } else {
    console.log("User not authenticated");
  }
  next();
});

app.use(routes);

app.listen(process.env.PORT);
