import async from "async";
import db from "../config/db.js";
import { generateCheckInID } from "../utils/generateCheckInID.js";

// Check-In
export const checkInVisitor = (req, res) => {
  async.waterfall(
    [
      function validate(cb) {
        const { name, email, company, host_employee } = req.body;

        if (!name || !email || !company || !host_employee) {
          return cb(new Error("Missing fields"));
        }

        cb(null, { name, email, company, host_employee });
      },

      function buildPayload(data, cb) {
        data.check_in_id = generateCheckInID();
        cb(null, data);
      },

      function save(data, cb) {
        db.transaction(async (trx) => {
          await trx("visitors").insert({
            ...data,
            status: "active",
          });
        })
          .then(() => cb(null, data))
          .catch((err) => cb(err));
      },
    ],
    function done(err, result) {
      if (err) {
        if (String(err.message).includes("unique")) {
          return res.status(409).json({
            error: "Active visit already exists for this email",
          });
        }

        return res.status(400).json({
          error: err.message,
        });
      }

      res.status(201).json({
        success: true,
        check_in_id: result.check_in_id,
      });
    },
  );
};

export const checkOutVisitor = async (req, res) => {
  try {
    const { check_in_id } = req.body;
    if (!check_in_id)
      return res.status(400).json({ error: "check_in_id required" });

    const result = await db.transaction(async (trx) => {
      const row = await trx("visitors")
        .where({ check_in_id })
        .first()
        .forUpdate();
      if (!row) throw new Error("NOT_FOUND");
      if (row.status !== "active") throw new Error("ALREADY_CHECKED_OUT");

      const now = new Date();
      const duration = Math.floor((now - new Date(row.check_in_time)) / 60000);

      await trx("visitors").where({ check_in_id }).update({
        check_out_time: now,
        duration_minutes: duration,
        status: "checked_out",
      });

      return { duration_minutes: duration };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === "NOT_FOUND")
      return res.status(404).json({ error: "Check-in ID not found" });
    if (err.message === "ALREADY_CHECKED_OUT")
      return res.status(409).json({ error: "Already checked out" });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getActiveVisitors = async (req, res) => {
  try {
    const rows = await db("visitors")
      .select(
        "check_in_id",
        "name",
        "email",
        "company",
        "host_employee",
        "check_in_time",
      )
      .where({ status: "active" })
      .orderBy("check_in_time", "desc");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
