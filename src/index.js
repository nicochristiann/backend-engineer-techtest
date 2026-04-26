import express from "express";
import knex from "knex";
import { initDB } from "./config/db.js";
import "dotenv/config";
import cors from "cors";

import visitorRoutes from "./routes/visitorRoutes.js";

const app = express();

app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5010;

app.use("/", visitorRoutes);

app.get("/", (req, res) => {
  res.send("Server OK");
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
  });
});
