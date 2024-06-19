import { Pool} from "pg";
import { Application, Request, Response } from "express";


class MembersDatabaseAPI{

    private pool: Pool;
    private app: Application;
  
    constructor(app: Application) {
      this.pool = new Pool({
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        port: 5432,
      });
  
      this.pool.on("connect", () => {
        console.log("Connected to the database");
      });

      this.app = app;
    }
  
    public setApp(expressApp: Application) {
      this.app = expressApp;
      this.initializeRoutes();
    }
  
    private initializeRoutes() {
      this.app.get("/members", this.getMembers.bind(this));
      this.app.get("/members/:id", this.getMemberById.bind(this));
      this.app.get("/languages", this.getLanguages.bind(this));
      this.app.get("/members/p_language/:name", this.getMembersByLanguage.bind(this));
    }
  
    private async getMembers(req: Request, res: Response) {
      try {
        const { rows } = await this.pool.query("SELECT * FROM developers");
        if(rows.length === 0) {
            res.status(404).send("No developers found");
            return;
        }
        res.json(rows);
      } catch (error:any) {
        res.status(500).send(error.message);
      }
    }
  
    private async getMemberById(req: Request, res: Response) {
      try {
        const { id } = req.params;
        const queryText = "SELECT * FROM developers WHERE id = $1";
        const { rows } = await this.pool.query(queryText, [id]);
        if(rows.length === 0) {
            res.status(404).send("Developer not found");
            return;
        }
        res.json(rows);
      } catch (error:any) {
        res.status(500).send(error.message);
      }
    }
  
    private async getLanguages(req: Request, res: Response) {
      try {
        const queryText = "SELECT language FROM programmingLanguages";
        const { rows } = await this.pool.query(queryText);
        if(rows.length === 0) {
            res.status(404).send("Languages not found");
            return;
        }
        res.json(rows);
      } catch (error:any) {
        res.status(500).send(error.message);
      }
    }
  
    private async getMembersByLanguage(req: Request, res: Response) {
      try {
        const { name } = req.params;
        const queryText = "SELECT developers FROM programmingLanguages WHERE language = $1";
        const { rows } = await this.pool.query(queryText, [name]);
        if(rows.length === 0) {
            res.status(404).send("Language not found");
            return;
        }
        res.json(rows);
      } catch (error:any) {
        res.status(500).send(error.message);
      }
    }
  }

  export { MembersDatabaseAPI };