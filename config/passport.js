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
  console.log("Serializing user:", user);
  const userType = user.adminid
    ? "adminid"
    : user.childid
    ? "childid"
    : "guideid";
  const userData = {};
  userData[userType] = user;

  done(null, userData);
});
passport.deserializeUser((id, done) => {
  knex("admin")
    .where({ adminid: id })
    .union(function () {
      this.select("*").from("child").where({ childid: id });
    })
    .union(function () {
      this.select("*").from("guide").where({ guideid: id });
    })
    .first()
    .then((user) => {
      if (!user) {
        return done(new Error("Invalid user id"));
      }
      const userType = user.adminid
        ? "admin"
        : user.childid
        ? "child"
        : "guide";
      done(null, { ...user, userType });
    })
    .catch((err) => done(err));
});

module.exports = passport;
