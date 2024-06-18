import express from 'express';
import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 8000;

const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
  auth: process.env.TOKEN_SECRET,
  baseUrl: 'https://api.github.com',
});

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host:  process.env.POSTGRES_HOST,
  database:  process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

app.use(express.json());

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  fillDatabase();
});

const fillDatabase = async () => {
  fillDevelopersTable()
  .then(() => console.log("Filling Repositories"))
  .then(() => fillRepositoriesTable())
  .then(() => console.log("Filling Programming Languages"))
  .then(() => fillLanguagesTable())
  .then(() => console.log("Database started"));
};


const fillDevelopersTable = async () => {
  const data = JSON.parse(fs.readFileSync("members.json", "utf-8"));
  for (const item of data) {
    //check if the item already exists
    const { rows } = await pool.query(
      "SELECT * FROM developers WHERE id = $1",
      [item.id]
    );
    if (rows.length === 0) {
      await pool.query(
        "INSERT INTO developers (id, name, reposlink, githublink) VALUES ($1, $2, $3, $4)",
        [item.id, item.login, item.repos_url, item.html_url]
      );
    }
  }
  const { rows } = await pool.query("SELECT * FROM developers");
  for (const row of rows) {
    const item = data.find((i: any) => i.id === row.id);
    if (!item) {
      await pool.query("DELETE FROM developers WHERE id = $1", [row.id]);
      console.log(`Deleted ${row.id}`);
    }
  }
};

const fillRepositoriesTable = async () => {
  const { rows } = await pool.query("SELECT * FROM developers"); 
  const repositories = await pool.query("SELECT * FROM repositories");
  for (const row of rows) {
    const { data } = await octokit.repos.listForUser({
      username: row.name,
    });
    for (const repo of data) {
      //check if the repo already exists
      const { rows } = await pool.query(
        "SELECT * FROM repositories WHERE id = $1",
        [repo.id]
      );
      if (rows.length === 0) {
        await pool.query(
          "INSERT INTO repositories (id, name, developer, languages_link, url) VALUES ($1, $2, $3, $4, $5)",
          [repo.id, repo.name, row.name , repo.languages_url, repo.html_url]
        );
      }
    }
  }
};

const fillLanguagesTable = async () => {
  const repositories = await pool.query("SELECT * FROM repositories");
  //Select all repositories
  for (const repo of repositories.rows) {
    //Get languages for repo
    const { data } = await octokit.request(repo.languages_link);
    //Corroborate that the repo has languages
    for (const lang in data) {
      //check if the language already exists
      const { rows } = await pool.query(
        "SELECT * FROM programminglanguages WHERE language = $1",
        [lang]
      );
      if (rows.length === 0) {
        await pool.query(
          "INSERT INTO programminglanguages (language) VALUES ($1)",
          [lang]
        );
      }

      const devsFound = await pool.query(
        "SELECT * FROM programminglanguages WHERE $1=ANY(developers) AND language=$2",[repo.developer, lang]
      )
      //Add Developers to the corresponding languages, if not yet there
      if(devsFound.rows.length === 0){
        await pool.query(
           `UPDATE programminglanguages
           SET developers = array_append(developers, $2)
           WHERE language = $1;
           `, [lang, repo.developer]
        );
      }
    }
  }
}

app.get('/members', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM developers');
    res.json(rows);
});

app.get('/members/:id', async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM developers WHERE id = $1', [id]);
    res.json(rows);
});

app.get('languages', async(req, res) => {
  const { rows } = await pool.query('SELECT * FROM programmingLanguages');
  res.json(rows);
})

app.get('/members/p_language/:name', async(req,res) =>{
  const { name } = req.params;
  const { rows } = await pool.query
  ('SELECT developers FROM programmingLanguages WHERE language = $1', [name]);
  res.json(rows);
})

//TODO: Sanitation of inputs, exceptions like C#, F#