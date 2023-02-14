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

app.post(`/api/login/:userType`, async (req, res) => {
  const userType = req.params.userType;
  const { username, password } = req.body;

  try {
    const result = await knex(`${userType}`).where({ username });

    if (result.length !== 1) {
      return res.json({ error_message: "No username" });
    }
    const isMatch = await compare(password, result[0].password);
    if (!isMatch) {
      return res.json({ error_message: "Wrong username/password" });
    } else {
      res.json({
        message: "login successfully",
        data: {
          username: result[0].username,
        },
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});
app.listen(process.env.PORT);
