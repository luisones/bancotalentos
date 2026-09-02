import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getRankingRows } = await import("../src/lib/queries/ranking");
  const t0 = Date.now();
  const rows = await getRankingRows(
    {},
    "00000000-0000-0000-0000-000000000000",
  );
  const ms = Date.now() - t0;
  const withScore = rows.filter((r) => r.consolidated !== null).length;
  console.log(
    JSON.stringify(
      {
        applications: rows.length,
        withScore,
        ms,
        top: rows.slice(0, 3).map((r) => ({
          name: r.candidateName,
          score: r.consolidated,
          coverage: r.coverage,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
