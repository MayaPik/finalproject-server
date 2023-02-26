const router = require("express").Router();
const passport = require("passport");
const isAuth = require("./AuthMiddleware").isAuth;
const isAdmin = require("./AuthMiddleware").isAdmin;
const isGuide = require("./AuthMiddleware").isGuide;

const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

router.post(
  "/api/:userType/login",
  passport.authenticate("local"),
  (req, res) => {
    res.json({ message: "login successful", user: req.user });
  }
);

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
  const { childid, day, time, date } = req.body;
  try {
    const result = await knex("ongoing").where({ childid, day, date });
    if (result.length === 0) {
      await knex("ongoing").insert({ childid, day, time, date });
    } else {
      await knex("ongoing").where({ childid, day, date }).update({ time });
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