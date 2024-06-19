import express from "express";
import { Pool} from "pg";
import { fillDatabase } from "./databaseUtils"
import dotenv from "dotenv";

const args = process.argv.slice(2);

dotenv.config();

const app = express();
const port = 8000;

const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.TOKEN_SECRET,
  baseUrl: "https://api.github.com",
});
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

app.use(express.json());

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
if(args[0] !== 'false') fillDatabase();
});

app.get("/members", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM developers");
  res.json(rows);
});

app.get("/members/:id", async (req, res) => {
  const { id } = req.params;
  const queryText = "SELECT * FROM developers WHERE id = $1";
  const { rows } = await pool.query(queryText, [id]);
  res.json(rows);
});

app.get("/languages", async (req, res) => {
  const queryText = "SELECT language FROM programmingLanguages";
  const { rows } = await pool.query(queryText);
  res.json(rows);
});

app.get("/members/p_language/:name", async (req, res) => {
  let { name } = req.params;
  const queryText = "SELECT developers FROM programmingLanguages WHERE language = $1";
  let { rows } = await pool.query(queryText, [name]);
  res.json(rows);
});