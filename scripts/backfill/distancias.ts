#!/usr/bin/env tsx
/**
 * Preenche `cep_locations` e `cep_distances` para os CEPs distintos dos
 * candidatos.
 *
 * Idempotente e retomável: só processa o que ainda não está gravado, então uma
 * interrupção no meio custa apenas o que faltava. É o que torna aceitável
 * depender de três serviços públicos sem SLA (BrasilAPI, Nominatim, OSRM) — a
 * aplicação nunca os chama, e o batch pode ser reexecutado à vontade.
 *
 *   npx tsx scripts/backfill/distancias.ts [--dry-run] [--force] [--reuse-locations] [--limit=N]
 *
 * `--reuse-locations` recalcula só os km a partir de `cep_locations` já
 * gravados — o caminho quando as coordenadas das unidades mudam. Sem isso,
 * `--force` regeocodifica cada CEP no Nominatim (~1 s cada) para obter o
 * mesmo ponto.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isNotNull, sql as raw } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";
import { candidates, cepDistances, cepLocations } from "../../src/lib/db/schema";
import { distancesFor, geocodeCep, type GeoPoint } from "../../src/lib/geo/cep";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/** Serviços públicos e gratuitos: 4 em paralelo é educado e suficiente. */
const CONCURRENCY = 4;

async function pool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function upsertDistances(
  cep: string,
  distances: Awaited<ReturnType<typeof distancesFor>>,
) {
  await db
    .insert(cepDistances)
    .values({
      cep,
      kmSantoAndre: distances.kmSantoAndre.toFixed(2),
      kmSaoCaetano: distances.kmSaoCaetano.toFixed(2),
      mode: distances.mode,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: cepDistances.cep,
      set: {
        kmSantoAndre: distances.kmSantoAndre.toFixed(2),
        kmSaoCaetano: distances.kmSaoCaetano.toFixed(2),
        mode: distances.mode,
        computedAt: new Date(),
      },
    });
}

function toPoint(lat: string | null, lng: string | null): GeoPoint | null {
  if (lat === null || lng === null) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  return point;
}

async function recomputeFromLocations(limit: number, dryRun: boolean) {
  const rows = await db
    .select({
      cep: cepLocations.cep,
      lat: cepLocations.lat,
      lng: cepLocations.lng,
    })
    .from(cepLocations);

  const withPoint = rows
    .map((row) => {
      const point = toPoint(row.lat, row.lng);
      return point ? { cep: row.cep, point } : null;
    })
    .filter((row): row is { cep: string; point: GeoPoint } => row !== null);

  const pending = withPoint.slice(0, limit === Infinity ? undefined : limit);
  const semCoordenada = rows.length - withPoint.length;
  console.log(
    `${rows.length} localizações · ${pending.length} com coordenada a recalcular` +
      (semCoordenada > 0 ? ` · ${semCoordenada} sem lat/lng` : "") +
      ".",
  );
  if (dryRun) {
    console.log("--dry-run: nada gravado.");
    return;
  }

  const stats = { ok: 0, rodoviaria: 0, linhaReta: 0 };
  await pool(pending, async ({ cep, point }) => {
    const distances = await distancesFor(point);
    await upsertDistances(cep, distances);
    stats.ok += 1;
    stats[distances.mode === "rodoviaria" ? "rodoviaria" : "linhaReta"] += 1;
    if (stats.ok % 50 === 0) console.log(`  ${stats.ok}/${pending.length}...`);
  });

  console.log(
    `Recalculados ${stats.ok}\n` +
      `Modo: rodoviária ${stats.rodoviaria} · linha reta ${stats.linhaReta}`,
  );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const reuseLocations = process.argv.includes("--reuse-locations");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  if (reuseLocations) {
    await recomputeFromLocations(limit, dryRun);
    return;
  }

  const distinct = await db
    .selectDistinct({ cep: candidates.postalCode })
    .from(candidates)
    .where(isNotNull(candidates.postalCode));

  const done = force
    ? new Set<string>()
    : new Set(
        (
          await db
            .select({ cep: cepDistances.cep })
            .from(cepDistances)
            .where(raw`${cepDistances.kmSantoAndre} is not null`)
        ).map((r) => r.cep),
      );

  const pending = distinct
    .map((r) => r.cep!)
    .filter((cep) => !done.has(cep))
    .slice(0, limit === Infinity ? undefined : limit);

  console.log(
    `${distinct.length} CEPs distintos · ${done.size} já resolvidos · ${pending.length} a processar.`,
  );
  if (dryRun) {
    console.log("--dry-run: nada gravado.");
    return;
  }

  const stats = {
    ok: 0,
    semGeocode: 0,
    rodoviaria: 0,
    linhaReta: 0,
    rua: 0,
    bairro: 0,
    cidade: 0,
  };

  await pool(pending, async (cep) => {
    const location = await geocodeCep(cep);
    if (!location) {
      // CEP que nenhuma fonte reconhece é estado válido: fica sem linha, e a
      // aplicação mostra "—" em vez de 0 km.
      stats.semGeocode += 1;
      console.warn(`  sem geocode: ${cep}`);
      return;
    }

    const distances = await distancesFor(location);

    await db
      .insert(cepLocations)
      .values({
        cep,
        lat: location.lat.toFixed(7),
        lng: location.lng.toFixed(7),
        city: location.city,
        uf: location.uf,
        precision: location.precision,
        source: location.source,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cepLocations.cep,
        set: {
          lat: location.lat.toFixed(7),
          lng: location.lng.toFixed(7),
          city: location.city,
          uf: location.uf,
          precision: location.precision,
          source: location.source,
          fetchedAt: new Date(),
        },
      });

    await upsertDistances(cep, distances);

    stats.ok += 1;
    stats[distances.mode === "rodoviaria" ? "rodoviaria" : "linhaReta"] += 1;
    stats[location.precision] += 1;
    if (stats.ok % 50 === 0) console.log(`  ${stats.ok}/${pending.length}...`);
  });

  console.log(
    `Gravados ${stats.ok} · sem geocode ${stats.semGeocode}\n` +
      `Modo: rodoviária ${stats.rodoviaria} · linha reta ${stats.linhaReta}\n` +
      `Precisão: rua ${stats.rua} · bairro ${stats.bairro} · cidade ${stats.cidade}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
