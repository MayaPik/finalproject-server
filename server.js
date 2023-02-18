require("dotenv").config();
const express = require("express");
const cors = require("cors");
const knex = require("knex")({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

const bcrypt = require("bcrypt");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.set("db", knex);

app.post(`/api/:userType/login`, async (req, res) => {
  const userType = req.params.userType;
  const { username, password } = req.body;
  try {
    const result = await knex(`${userType}`).where({ username });
    if (result.length !== 1) {
      return res.json({ error_message: "No username" });
    }
    const isMatch = await bcrypt.compare(password, result[0].password);
    if (!isMatch) {
      return res.json({ error_message: "Wrong username/password" });
    } else {
      res.json({
        message: "login successfully",
        data: {
          user: result[0],
        },
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// app.post(`/api/childrenid/:guideid`, async (req, res) => {
//   const guideid = req.params.guideid;

//   try {
//     const result = await knex(`child`).where({ guideid: guideid });
//     if (result.length !== 1) {
//       return res.json({ error_message: "No children for this hour" });
//     } else {
//       res.json({
//         message: "successfull",
//         data: result,
//       });
//     }
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server error");
//   }
// });

app.post(`/api/updateFixedTimes`, async (req, res) => {
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

app.post(`/api/updateOngoingTimes`, async (req, res) => {
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

app.get(`/api/getAllChildrenOfHour`, async (req, res) => {
  const day = req.query.day;
  const time = req.query.time;
  const guideid = req.query.guideid;
  const date = req.query.date;

  try {
    const result = await knex
      .select("children.childid", "children.first_name", "children.last_name")
      .from("children")
      .leftJoin("fixed", function () {
        this.on("children.childid", "=", "fixed.childid")
          .andOn("children.guideid", "=", knex.raw("?", [guideid]))
          .andOn("fixed.day", "=", knex.raw("?", [day]))
          .andOn("fixed.time", "=", knex.raw("?", [time]));
      })
      .leftJoin("ongoing", function () {
        this.on("children.childid", "=", "ongoing.childid")
          .andOn("children.guideid", "=", knex.raw("?", [guideid]))
          .andOn("ongoing.day", "=", knex.raw("?", [day]))
          .andOn("ongoing.time", "=", knex.raw("?", [time]))
          .andOn("ongoing.date", "=", knex.raw("?", [date]));
      })
      .whereNotNull("fixed.childid")
      .orWhereNotNull("ongoing.childid")
      .orderBy("children.childid")
      .orderBy("children.day")
      .orderBy("children.hour")
      .groupBy("children.childid");
    // .havingRaw("MAX(ongoing.childid) IS NOT NULL")
    // .select("children.childid", "children.first_name", "children.last_name");

    if (result.length === 0) {
      return res.json({ error_message: "No children for this hour" });
    } else {
      const children = await result.map((child) => {
        return {
          childid: child.childid,
          first_name: child.first_name,
          last_name: child.last_name,
        };
      });
      res.json({
        message: "successfull",
        data: children,
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

app.listen(process.env.PORT);
