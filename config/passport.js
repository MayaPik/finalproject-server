require("dotenv").config();
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, username, password, done) => {
      const userType = req.query.userType;
      const user = await knex(userType).where({ username: username }).first();
      if (!user) {
        return done(null, false);
      }
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser((user_id, done) => {
  Promise.all([
    knex("admin").where({ user_id: user_id }).select(),
    knex("child").where({ user_id: user_id }).select(),
    knex("guide").where({ user_id: user_id }).select(),
  ])
    .then((results) => {
      const user = results.reduce((acc, val) => acc.concat(val), [])[0];
      if (!user) {
        return done(new Error("Invalid user id"));
      }
      done(null, user);
    })
    .catch((err) => done(err));
});

module.exports = passport;
