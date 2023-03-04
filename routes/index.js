const isAuth = require("./AuthMiddleware").isAuth;
const isAdmin = require("./AuthMiddleware").isAdmin;
const isGuide = require("./AuthMiddleware").isGuide;
const deserializeUser = require("./deserializeUser");

const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

const router = require("express").Router();
const passport = require("passport");
router.post(
  "/api/:userType/login",
  function (req, res, next) {
    req.query.userType = req.params.userType;
    next();
  },
  passport.authenticate("local", {
    successRedirect: "/success",
    failureRedirect: "/failure",
  }),
  function (req, res) {
    req.login(req.user, function (err) {
      if (err) {
        return next(err);
      }
      res.status(200).json({
        message: "Login successful",
        data: {
          session: req.session,
          user: req.user,
          req: req.session.user,
          user_id: req.session.passport.user,
        },
      });
    });
  }
);

router.get("/success", (req, res) => {
  res.status(200).json({
    message: "Login successful",
    data: {
      session: req.session,
      user: req.user,
      req: req.session.user,
      user_id: req.session.passport.user,
    },
  });
});

router.get("/failure", (req, res) => {
  res.status(401).json({
    error_message: "Login failed",
  });
});

router.post("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.sendStatus(500);
    }
    res.sendStatus(200);
  });
});

router.get("/api/user", (req, res) => {
  if (req.session.passport && req.session.passport.user) {
    deserializeUser(req.session.passport.user, (err, user) => {
      if (err) {
        return res.sendStatus(401);
      }
      res.json(user);
    });
  } else {
    res.sendStatus(401);
  }
});

router.post(`/api/updateFixedTimes`, isAuth, async (req, res) => {
  const { childid, day, time } = req.body;
  try {
    const result = await knex("fixed").where({ childid, day });
    if (result.length === 0) {
      await knex("fixed").insert({ childid, day, time });
    } else {
      await knex("fixed").where({ childid, day }).update({ time });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.post(`/api/updateOngoingTimes`, isAuth, async (req, res) => {
  const { childid, day, time, date, message } = req.body;
  try {
    const result = await knex("ongoing").where({ childid, day, date });
    if (result.length === 0) {
      await knex("ongoing").insert({ childid, day, time, date, message });
    } else {
      await knex("ongoing")
        .where({ childid, day, date })
        .update({ time, message });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.get(`/api/getAllChildrenOfHour`, isGuide, async (req, res) => {
  const day = req.query.day;
  const time = req.query.time;
  const guideid = req.query.guideid;
  const date = req.query.date;

  try {
    const query = knex
      .select(
        "child.childid",
        "child.first_name",
        "child.last_name",
        "child.classid",
        knex.raw("CASE WHEN ? = 'else' THEN ongoing.time ELSE ? END AS time", [
          time,
          time,
        ])
      )
      .from("child")
      .leftJoin("fixed", function () {
        this.on("child.childid", "=", "fixed.childid")
          .andOn("fixed.day", "=", knex.raw("?", [day]))
          .andOn("fixed.time", "=", knex.raw("?", [time]));
        if (guideid) {
          this.andOn("child.guideid", "=", knex.raw("?", [guideid]));
        }
      })
      .leftJoin("ongoing", function () {
        this.on("child.childid", "=", "ongoing.childid")
          .andOn("ongoing.day", "=", knex.raw("?", [day]))
          .andOn("ongoing.date", "=", knex.raw("?", [date]));
        if (time === "else") {
          this.andOnNotIn("ongoing.time", ["15:00", "15:30", "00:00"]);
        } else {
          this.andOn("ongoing.time", "=", knex.raw("?", [time]));
        }
        if (guideid) {
          this.andOn("child.guideid", "=", knex.raw("?", [guideid]));
        }
      })
      .where(function () {
        this.whereNotNull("fixed.childid").orWhereNotNull("ongoing.childid");
      })
      .groupBy(
        "child.childid",
        "child.first_name",
        "child.last_name",
        "child.classid",
        "ongoing.time"
      )
      .havingRaw("MAX(ongoing.childid) IS NOT NULL");

    const result = await query;

    if (result.length === 0) {
      return res.json({ error_message: "No children for this hour" });
    } else {
      const children = await result.map((child) => {
        return {
          childid: child.childid,
          first_name: child.first_name,
          last_name: child.last_name,
          class: child.classid,
          ...(req.query.time === "else" ? { time: child.time } : {}),
        };
      });
      res.json({
        message: "successful",
        data: children,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});
router.get(`/api/getOngoingMessages`, isGuide, async (req, res) => {
  const day = req.query.day;
  const guideid = req.query.guideid;
  const date = req.query.date;

  try {
    const query = knex
      .select("child.first_name", "child.last_name", "ongoing.message")
      .from("child")
      .innerJoin("ongoing", "child.childid", "ongoing.childid")
      .where("ongoing.day", "=", day)
      .andWhere("ongoing.date", "=", date)
      .andWhereRaw("ongoing.message ~ '[a-zA-Z]'")
      .andWhere("child.guideid", "=", guideid)
      .andWhereNotNull("ongoing.message");

    const result = await query;

    if (result.length === 0) {
      return res.json({ message: "No ongoing messages found." });
    } else {
      const messages = result.map((row) => ({
        first_name: row.first_name,
        last_name: row.last_name,
        message: row.message,
      }));

      return res.json({
        message: "Ongoing messages retrieved successfully.",
        data: messages,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

router.get(`/api/getClassName`, isGuide, async (req, res) => {
  const classid = req.query.classid;

  try {
    const query = knex
      .select("class.classid", "class.class_name")
      .from("class")
      .where("classid", classid);

    const result = await query;

    if (result.length === 0) {
      return res.json({ error_message: "No class for the classid" });
    } else {
      res.json({
        message: "successful",
        class_name: result[0].class_name,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

router.get(`/api/getAllChildren`, isAdmin, async (req, res) => {
  try {
    const query = knex
      .select(
        "child.childid",
        "child.first_name",
        "child.last_name",
        "child.classid"
      )
      .from("child");
    const result = await query;
    if (result.length === 0) {
      return res.json({ error_message: "No children" });
    } else {
      const children = await result.map((child) => {
        return {
          childid: child.childid,
          first_name: child.first_name,
          last_name: child.last_name,
          class: child.classid,
        };
      });
      res.json({
        message: "successful",
        data: children,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

module.exports = router;
