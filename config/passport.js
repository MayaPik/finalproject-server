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

// passport.deserializeUser((userData, done) => {
//   const userType = Object.keys(userData)[0];
//   const userId = userData[userType].id;
//   knex(userType)
//     .where({ id: userId })
//     .first()
//     .then((user) => {
//       if (!user) {
//         return done(new Error("Invalid user id"));
//       }
//       done(null, user);
//     })
//     .catch((err) => done(err));
// });

passport.deserializeUser((userData, done) => {
  knex("admin")
    .where({ adminid: userData })
    .union(function () {
      this.select("*").from("child").where({ childid: userData });
    })
    .union(function () {
      this.select("*").from("guide").where({ guideid: userData });
    })
    .first()
    .then((user) => {
      if (!user) {
        return done(new Error("Invalid user id"));
      }
      done(null, { user });
    })
    .catch((err) => done(err));
});

module.exports = passport;
