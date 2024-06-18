import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import { Octokit } from '@octokit/rest';

dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

const octokit = new Octokit({
  auth: process.env.TOKEN_SECRET,
  baseUrl: 'https://api.github.com',
});

const fillDatabase = async () => {
    fillDevelopersTable()
      // .then(() => console.log("Filling Repositories"))
      // .then(() => fillRepositoriesTable())
      .then(() => console.log("Filling Programming Languages"))
      .then(() => fillLanguagesTable())
      .then(() => console.log("Database started"));
  };
  
  const fillDevelopersTable = async () => {
    const data = JSON.parse(fs.readFileSync("members.json", "utf-8"));
  
    const currentDevs = await pool.query("SELECT * FROM developers");
    const namesInDB: string[] = currentDevs.rows.map((row) => row["name"]);
    const namesFromAPI: string[] = data.map((obj: any) => obj.login);
    const devsToAdd = namesFromAPI.filter((name) => !namesInDB.includes(name));
    const devsToRemove = namesInDB.filter((name) => !namesFromAPI.includes(name));
  
    for (const name of devsToRemove) {
      await pool.query("DELETE FROM developers WHERE name = $1", [name]);
      console.log(`Deleted ${name}`);
      await pool.query("DELETE FROM repositories WHERE developer = $1", [name]);
      console.log(`Deleted ${name}'s repositories`);
      await pool.query(
        "UPDATE programminglanguages SET developers = array_remove(developers, $1)",
        [name]
      );
      console.log(`Removed ${name} from languages`);
    }
    for (const name of devsToAdd) {
      const dev = data.find((obj: any) => obj.login === name);
      await pool.query(
        "INSERT INTO developers (id, name, reposlink, githublink) VALUES ($1, $2, $3, $4)",
        [dev.id, dev.login, dev.repos_url, dev.html_url]
      );
    }
  };
  
  const fillRepositoriesTable = async () => {
    const developers = await pool.query("SELECT * FROM developers");
    const repositories = await pool.query("SELECT * FROM repositories");
    const owners: string[] = developers.rows.map((row) => row.name);
    const reposNamesDB: string[] = repositories.rows.map((row) => row.name);
  
    for (const owner of owners) {
      const ownerReposDB: string[] = repositories.rows
        .filter((row) => row.developer === owner)
        .map((row) => row.name);
  
      const reposFromAPI =  await octokit.repos.listForUser({
        username: owner,
      });
  
      const ownerReposAPI: string[] = reposFromAPI.data.map(
        (repo: any) => repo.name
      );
      const reposToAdd = ownerReposAPI.filter(
        (name) => !ownerReposDB.includes(name)
      );
      const reposToRemove = ownerReposDB.filter(
        (name) => !ownerReposAPI.includes(name)
      );
  if(reposToRemove.length === 0)
        // await pool.query("DELETE FROM repositories WHERE name = ANY($1)", [reposToRemove]);
      for (const repo of reposToRemove) {
        await pool.query("DELETE FROM repositories WHERE name = $1", [repo]);
        console.log(`Deleted ${repo}`);
      }
  if(reposToAdd.length === 0)
      for (const repo of reposToAdd) {
        const repoData = reposFromAPI.data.find((obj: any) => obj.name === repo);
        if(repoData)
        await pool.query(
          "INSERT INTO repositories (id, name, developer, languages_link, url) VALUES ($1, $2, $3, $4, $5)",
          [
            repoData.id,
            repoData.name,
            owner,
            repoData.languages_url,
            repoData.html_url,
          ]
        );
        console.log(`Added ${repo}`);
      }
    }
  };
  
  const fillLanguagesTable = async () => {
    //Array of developer names
    const developerNamesOnDB: string[] = await pool
      .query("SELECT * FROM developers")
      .then((res) => res.rows.map((row) => row.name));
    //Select all repositories
    const repositoriesOnDB = await pool.query("SELECT * FROM repositories");
    //Array of languages in the database
    const languagesInDB = await pool.query("SELECT * FROM programminglanguages")
    .then((res) => res.rows.map((row) => row.language));
    //Array developers per language
    const devLanguages: { [key: string]: string[] } = {};
    //Set of languages from the API
    let languagesFromAPI = new Set<string>();

    //Get languages for each repo and for each dev
    for (const dev of developerNamesOnDB) {
      console.log("dev", dev);
      //Get all repos for the developer
      const devRepos = repositoriesOnDB.rows.filter((row) => {
        return row.developer === dev
      });
      const tmp:string[] = ["TypeScript", "JavaScript", "HTML", "C", "Vue", "Java", "CSS", "Objective-C", "Python", "Ruby", "chacha"];
      //Get languages for each repo
      for (const repo of devRepos) {
        if(dev !== "rueckemann" && dev !== "goekhanm" ) continue;
        const repoLangs:string[] = [tmp[Math.floor(Math.random() * tmp.length)]];
        //await octokit.request(repo.languages_link)
          // .then((res: any) => Object.keys(res.data));
        for (const lang of repoLangs) {
          languagesFromAPI.add(lang);
          devLanguages[lang] = devLanguages[lang] || [];
          if(!devLanguages[lang].includes(dev))
            devLanguages[lang].push(dev);
        }
      }
    }

    console.log("devLanguages", devLanguages);

    const languagesToAdd:string[] = Array.from(languagesFromAPI)
      .filter((lang) => !languagesInDB.includes(lang));
    const languagesToRemove:string[] = languagesInDB
      .filter((lang) => !Array.from(languagesFromAPI).includes(lang));
    for (const lang of languagesToAdd){
      await pool.query("INSERT INTO programminglanguages (language) VALUES ($1)", [lang]);
      console.log(`Added ${lang}`);
    }
    for (const lang of languagesToRemove){
      await pool.query("DELETE FROM programminglanguages WHERE language = $1", [lang]);
      console.log(`Deleted ${lang}`);
    }
    const queryLanguages = await pool.query("SELECT * FROM programminglanguages")
    .then((res) => res.rows.map((row) => {
      let devs:string[] = row.developers;
      let lang:string = row.language;
      return [lang, devs];
    }));

    console.log(queryLanguages)
    for(const [lang, devs] of queryLanguages){
      console.log("Languages: ", lang);
      console.log("Devs in DB for language", devs);
    }
    
      //I have to update the developers for each language
      //I have the updated languages (and their devs) from the database and the languages from the api (and their devs)
  // for (let i = 0; i < updatedLanguages.length; i++){
      // const lang:string = Object.keys(updatedLanguages[i])[0];
      // const devs = updatedLanguages[i][];
      // const updatedDevs:string[] = devLanguages[lang];
      // console.log("Languages: ", lang);
      // console.log("Devs in DB for language", updatedLanguages.map((obj) => obj[lang]));
      // console.log("Devs updated", updatedDevs);
      // const devsToAdd = updatedDevs.filter((dev) => !devs.includes(dev));
      // const devsToRemove = devs.filter((dev) => !updatedDevs.includes(dev));
      // for (const dev of devsToAdd){
      //   await pool.query("UPDATE programminglanguages SET developers = array_append(developers, $2) WHERE language = $1", [lang, dev]);
      //   console.log(`Added ${dev} to ${lang}`);
      // }
      // for (const dev of devsToRemove){
      //   await pool.query("UPDATE programminglanguages SET developers = array_remove(developers, $2) WHERE language = $1", [lang, dev]);
      //   console.log(`Removed ${dev} from ${lang}`);
      // }
    // }
  };
  export { fillDatabase};