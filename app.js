require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const routes = require("./routes");
const app = express();

app.set("trust proxy", 1);

app.use(
  session({
    store: new (require("connect-pg-simple")(session))({
      conString: process.env.DATABASE_URL,
    }),
    secret: process.env.SECRET_KEY,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 4000, //120 days
      secure: true,
      domain: ".pickinguptime.com",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 4000),
    },
    proxy: true,
  })
);

app.use(
  cors({ origin: "https://welcome.pickinguptime.com", credentials: true })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

require("./config/passport");

app.use(passport.initialize());
app.use(passport.session());

app.use(routes);

app.use((req, res, next) => {
  console.log(req.session);
  console.log(req.user);
  next();
});

app.listen(process.env.PORT);
