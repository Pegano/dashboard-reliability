import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "pulse_test",
  user: "powerbi_reader",
  password: "PulseBI2026!",
  ssl: false,
});

const ALLOWED_TABLES = ["customers", "orders", "products"];

export async function GET(request: NextRequest) {
  const table = request.nextUrl.searchParams.get("table") ?? "customers";
  const type = request.nextUrl.searchParams.get("type") ?? "data";

  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }

  try {
    if (type === "metadata") {
      const [cols, rowCount] = await Promise.all([
        pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]),
        pool.query(`SELECT COUNT(*) as count FROM ${table}`),
      ]);
      return NextResponse.json({
        row_count: parseInt(rowCount.rows[0].count),
        columns: cols.rows,
      });
    }

    const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1 LIMIT 500`);
    return NextResponse.json({
      columns: result.fields.map((f) => f.name),
      rows: result.rows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
