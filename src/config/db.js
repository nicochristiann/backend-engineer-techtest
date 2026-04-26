import knex from "knex";
import "dotenv/config";

const db = knex({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
});

export const initDB = async () => {
  const exists = await db.schema.hasTable("visitors");
  if (!exists) {
    await db.schema.createTable("visitors", (t) => {
      t.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));
      t.string("check_in_id").unique().notNullable();
      t.string("name").notNullable();
      t.string("email").notNullable();
      t.string("company").notNullable();
      t.string("host_employee").notNullable();
      t.timestamp("check_in_time").defaultTo(db.fn.now());
      t.timestamp("check_out_time").nullable();
      t.integer("duration_minutes").nullable();
      t.string("status").notNullable().defaultTo("active");
      t.timestamps(true, true);
    });
    await db.raw(
      "CREATE UNIQUE INDEX unique_active_email ON visitors(email) WHERE status='active';",
    );
  }
};

export default db;
