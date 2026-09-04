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
 *   npx tsx scripts/backfill/distancias.ts [--dry-run] [--force] [--limit=N]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isNotNull, sql as raw } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";
import { candidates, cepDistances, cepLocations } from "../../src/lib/db/schema";
import { distancesFor, geocodeCep } from "../../src/lib/geo/cep";

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

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

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
