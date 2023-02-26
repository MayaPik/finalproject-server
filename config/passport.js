require("dotenv").config();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

const options = {
  usernameField: "username",
  passwordField: "password",
};

passport.use(
  new LocalStrategy(options, async (req, username, password, done) => {
    const userType = req.params.userType;
    const result = await knex(`${userType}`)
      .select("*")
      .where({ username })
      .andWhereNot({ password })
      .first();
    if (result !== 1) {
      return done(null, false);
    }
    const match = await bcrypt.compare(password, result.password);
    if (match) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  })
);

passport.serializeUser((user, done) => {
  const userType = req.params.userType;
  const table = userType === "child" ? "guide" : "admin";

  done(null, user[`${table}id`]);
});

passport.deserializeUser((id, userType, done) => {
  const table = userType === "child" ? "guide" : "admin";

  knex(table)
    .where(`${table}id`)
    .first()
    .then((user) => {
      done(null, user);
    })
    .catch((err) => done(err));
});

module.exports = passport;
