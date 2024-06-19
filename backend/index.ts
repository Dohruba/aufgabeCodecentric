import express from "express";
import { fillDatabase } from "./utils/databaseUtils"
import dotenv from "dotenv";
import { MembersDatabaseAPI } from "./utils/membersApi";

const args = process.argv.slice(2);
dotenv.config();
const app = express();
const backendPort = 8000;

app.use(express.json());
const membersDatabaseAPI = new MembersDatabaseAPI(app);
app.listen(backendPort, () => {
  console.log(`Server is running on http://localhost:${backendPort}`);
if(args[0] !== 'false') fillDatabase();
});

membersDatabaseAPI.setApp(app);