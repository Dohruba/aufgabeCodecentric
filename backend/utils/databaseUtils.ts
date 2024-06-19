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
      .then(() => console.log("Filling Repositories"))
      .then(() => fillRepositoriesTable())
      .then(() => console.log("Filling Programming Languages"))
      .then(() => fillLanguagesTable())
      .then(() => console.log("Database ready"));
  };
  
  const fillDevelopersTable = async () => {
    const members = await octokit.orgs.listMembers({
      org: "codecentric",
    });
    console.log("api: ",members["data"]);
    const devsDataAPI = members["data"];
    //JSON.parse(fs.readFileSync("members.json", "utf-8"));
    console.log("file: ",devsDataAPI);
    const devNamesInAPI: string[] = devsDataAPI.map((obj: any) => obj.login);
  
    const devsDataDB = await pool.query("SELECT * FROM developers");
    const devNamesInDB: string[] = devsDataDB.rows.map((row) => row["name"]);

    const devsToAdd = devNamesInAPI.filter((name) => !devNamesInDB.includes(name));
    const devsToRemove = devNamesInDB.filter((name) => !devNamesInAPI.includes(name));
  
    for (const name of devsToRemove) {
      await pool.query("DELETE FROM developers WHERE name = $1", [name]);
      await pool.query("DELETE FROM repositories WHERE developer = $1", [name]);
      await pool.query(
        "UPDATE programminglanguages SET developers = array_remove(developers, $1)",
        [name]);
    }
    for (const name of devsToAdd) {
      const developer = devsDataAPI.find((obj: any) => obj.login === name);
      if (developer)
      await pool.query(
        "INSERT INTO developers (id, name, reposlink, githublink) VALUES ($1, $2, $3, $4)",
        [developer.id, developer.login, developer.repos_url, developer.html_url]
      );
    }
  };
  
  const fillRepositoriesTable = async () => {
    const developers = await pool.query("SELECT * FROM developers");
    const reposInDB = await pool.query("SELECT * FROM repositories");
    const devNames: string[] = developers.rows.map((row) => row.name);
  
    for (const devName of devNames) {
      const ownerNamesDB: string[] = reposInDB.rows
        .filter((row) => row.developer === devName)
        .map((row) => row.name);

      const reposFromAPI = await octokit.repos.listForUser({
        username: devName,
      });

      const ownerReposAPI: string[] = reposFromAPI.data.map(
        (repo: any) => repo.name
      );
      const reposToAdd = ownerReposAPI.filter(
        (name) => !ownerNamesDB.includes(name)
      );
      const reposToRemove = ownerNamesDB.filter(
        (name) => !ownerReposAPI.includes(name)
      );

      if (reposToRemove.length !== 0)
        for (const repo of reposToRemove) {
          await pool.query("DELETE FROM repositories WHERE name = $1", [repo]);
        }
      if (reposToAdd.length !== 0)
        for (const repo of reposToAdd) {
          const repoData = reposFromAPI.data.find(
            (obj: any) => obj.name === repo
          );
          if (repoData)
            await pool.query(
              "INSERT INTO repositories (id, name, developer, languages_link, url) VALUES ($1, $2, $3, $4, $5)",
              [
                repoData.id,
                repoData.name,
                devName,
                repoData.languages_url,
                repoData.html_url,
              ]
            );
        }
    }
  };
  
  const fillLanguagesTable = async () => {
    const devNamesInDB: string[] = await pool
      .query("SELECT * FROM developers")
      .then((res) => res.rows.map((row) => row.name));
    const reposInDB = await pool.query("SELECT * FROM repositories");
    const languagesInDB = await pool.query("SELECT * FROM programminglanguages")
    .then((res) => res.rows.map((row) => row.language));
    //Array of [language, [developers]]
    const languageDevsAPI: [string, string[]][] = [];
    let allLanguagesInAPI = new Set<string>();

    for (const devName of devNamesInDB) {
      const devRepos = reposInDB.rows.filter((row) => {
        return row.developer === devName
      });
      for (const repo of devRepos) {
        //Languages in repository
        const repoLangs:string[] = 
        await octokit.request(repo.languages_link)
          .then((res: any) => Object.keys(res.data));
          for (let lang of repoLangs) {
          //Replace # with sharp, to facilitate DB queries
          if(lang.includes("#")) {
            lang = lang.replace("#", "sharp");
          }
          allLanguagesInAPI.add(lang);
          let langEntry = languageDevsAPI.find((entry) => entry[0] === lang);
          if (!langEntry) {
            langEntry = [lang, []];
            languageDevsAPI.push(langEntry);
          }
          if (!langEntry[1].includes(devName)) {
            langEntry[1].push(devName);
          }
        }
      }
    }

    const languagesToAdd:string[] = Array.from(allLanguagesInAPI)
      .filter((lang) => !languagesInDB.includes(lang));
    const languagesToRemove:string[] = languagesInDB
      .filter((lang) => !Array.from(allLanguagesInAPI).includes(lang));

    for (const lang of languagesToAdd){
      await pool.query("INSERT INTO programminglanguages (language) VALUES ($1)", [lang]);
    }
    for (const lang of languagesToRemove){
      await pool.query("DELETE FROM programminglanguages WHERE language = $1", [lang]);
    }
    const updatedLangsInDB: [string, string[]][] = await pool.query("SELECT * FROM programminglanguages")
    .then((res) => res.rows.map((row) => {
      let devs:string[] = row.developers;
      let lang:string = row.language;
      return [lang, devs];
    }));

    for(const [lang, devsInDB] of updatedLangsInDB){
      const languageDevs = languageDevsAPI.find((entry) => entry[0] === lang);
      let devsToAdd:string[] = [];
      let devsToRemove:string[] = [];

      if(languageDevs){
        if(!devsInDB){
          devsToAdd = languageDevs[1];
          devsToRemove = [];
        }else{
          devsToAdd = languageDevs[1].filter((dev) => !devsInDB.includes(dev));
          devsToRemove = devsInDB.filter((dev) => !languageDevs[1].includes(dev));
        }
      }
      
      for (const dev of devsToAdd) {
        await pool.query("UPDATE programminglanguages SET developers = array_append(developers, $2) WHERE language = $1", [lang, dev]);
      }
      for (const dev of devsToRemove) {
        await pool.query("UPDATE programminglanguages SET developers = array_remove(developers, $2) WHERE language = $1", [lang, dev]);
      }
    } 

  };
  
  export { fillDatabase};