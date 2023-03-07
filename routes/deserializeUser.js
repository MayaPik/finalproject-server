const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

module.exports = function deserializeUser(user_id, done) {
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
      delete user.password;
      done(null, user);
    })
    .catch((err) => done(err));
};
