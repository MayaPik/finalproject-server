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
  const userType = user.userType;
  const table = userType === "child" ? "guide" : "admin";
  done(null, user[`${table}id`]);
});

passport.deserializeUser((id, done) => {
  knex("admin")
    .where({ adminid: id })
    .first()
    .then((user) => {
      if (!user) {
        return knex("guide")
          .where({ guideid: id })
          .first()
          .then((user) => {
            if (!user) {
              return knex("child")
                .where({ childid: id })
                .first()
                .then((user) => {
                  if (!user) {
                    return done(new Error("Invalid user id"));
                  }
                  done(null, { ...user, userType: "child" });
                });
            }
            done(null, { ...user, userType: "guide" });
          });
      }
      done(null, { ...user, userType: "admin" });
    })
    .catch((err) => done(err));
});

module.exports = passport;
