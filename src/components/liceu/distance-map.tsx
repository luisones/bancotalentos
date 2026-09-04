import { UNITS } from "@/lib/geo/units";
import { distanceProvenance, formatKm } from "@/lib/geo/distance-label";
import { cn } from "@/lib/utils";

/**
 * Onde o candidato mora, em relação às duas unidades.
 *
 * É um ESQUEMA, não um mapa: três pontos, a distância entre eles e o norte para
 * cima. Não há ruas porque a pergunta que esta figura responde — "esse
 * professor mora longe?" — não precisa delas, e um mapa de verdade custaria uma
 * biblioteca, uma chave de API e centenas de kilobytes de tiles por abertura,
 * numa lista onde a célula é clicada dezenas de vezes por sessão. Aqui o custo
 * é zero: nenhuma requisição, nenhuma dependência, abre instantâneo.
 *
 * Quem precisa das ruas tem o link para o Google Maps, que é onde as ruas
 * importam — traçando a rota real, não olhando uma figura.
 *
 * Server Component: só desenha. As coordenadas já vêm no view model.
 */
export function DistanceMap({
  lat,
  lng,
  kmSantoAndre,
  kmSaoCaetano,
  mode,
  precision,
  city,
  className,
}: {
  lat: number | null;
  lng: number | null;
  kmSantoAndre: number | null;
  kmSaoCaetano: number | null;
  mode: string | null;
  precision: string | null;
  city?: string | null;
  className?: string;
}) {
  const santoAndre = formatKm(kmSantoAndre, mode, precision);
  const saoCaetano = formatKm(kmSaoCaetano, mode, precision);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {lat !== null && lng !== null ? (
        <Schematic lat={lat} lng={lng} />
      ) : (
        <p className="text-meta rounded-panel border border-dashed border-rule-strong px-3 py-4 text-center text-subtle">
          {kmSantoAndre === null
            ? "Sem CEP cadastrado — não há como situar a moradia."
            : "Distância conhecida, mas sem coordenada para desenhar."}
        </p>
      )}

      <dl className="text-cell flex flex-col gap-0.5">
        <Line label="Santo André" value={santoAndre} />
        <Line label="São Caetano" value={saoCaetano} />
      </dl>

      {kmSantoAndre !== null && (
        <p className="text-meta text-subtle">
          {distanceProvenance(mode, precision)}
          {city ? ` · ${city}` : ""}
        </p>
      )}

      {lat !== null && lng !== null && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <RouteLink
            lat={lat}
            lng={lng}
            unit={UNITS.santoAndre}
            label="Rota até Santo André"
          />
          <RouteLink
            lat={lat}
            lng={lng}
            unit={UNITS.saoCaetano}
            label="Rota até São Caetano"
          />
        </div>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-micro uppercase tracking-micro text-label">{label}</dt>
      <dd
        data-numeric
        className={cn("font-semibold", value ? "text-ink" : "text-faint")}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function RouteLink({
  lat,
  lng,
  unit,
  label,
}: {
  lat: number;
  lng: number;
  unit: { lat: number; lng: number };
  label: string;
}) {
  const href = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${unit.lat},${unit.lng}&travelmode=driving`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-meta font-semibold text-gold-text hover:underline"
    >
      {label} ↗
    </a>
  );
}

const WIDTH = 248;
const HEIGHT = 150;
const PAD = 18;

/**
 * Projeção equirretangular com correção de meridiano.
 *
 * A longitude é comprimida por `cos(lat)` — sem isso, na latitude −23,6° a
 * figura fica ~9% esticada na horizontal e a proporção entre "longe pro lado" e
 * "longe pra cima" mente. Uma Mercator completa não muda nada visível num
 * recorte de 30km, e este é o tipo de figura em que o erro que importa é o de
 * proporção, não o de forma.
 */
function Schematic({ lat, lng }: { lat: number; lng: number }) {
  const points = [
    { key: "cand", lat, lng, label: "Moradia", tone: "gold" as const },
    {
      key: "sa",
      lat: UNITS.santoAndre.lat,
      lng: UNITS.santoAndre.lng,
      label: "Sto. André",
      tone: "navy" as const,
    },
    {
      key: "scs",
      lat: UNITS.saoCaetano.lat,
      lng: UNITS.saoCaetano.lng,
      label: "S. Caetano",
      tone: "navy" as const,
    },
  ];

  const cosLat = Math.cos((lat * Math.PI) / 180);
  const xs = points.map((p) => p.lng * cosLat);
  const ys = points.map((p) => p.lat);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Uma escala só para os dois eixos: escalas diferentes fariam 2km na vertical
  // parecerem 20km na horizontal. O excedente vira margem, centralizada.
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const scale = Math.min(
    spanX > 0 ? (WIDTH - PAD * 2) / spanX : Infinity,
    spanY > 0 ? (HEIGHT - PAD * 2) / spanY : Infinity,
  );
  const safeScale = Number.isFinite(scale) ? scale : 1;

  const offsetX = (WIDTH - spanX * safeScale) / 2;
  const offsetY = (HEIGHT - spanY * safeScale) / 2;

  const project = (pLat: number, pLng: number) => ({
    x: offsetX + (pLng * cosLat - minX) * safeScale,
    // Norte para cima: y do SVG cresce para baixo.
    y: HEIGHT - offsetY - (pLat - minY) * safeScale,
  });

  const placed = points.map((p) => ({ ...p, ...project(p.lat, p.lng) }));
  const [home, ...units] = placed;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full rounded-panel border border-rule bg-sunken"
      role="img"
      aria-label="Posição relativa entre a moradia do candidato e as duas unidades"
    >
      {units.map((unit) => (
        <line
          key={unit.key}
          x1={home.x}
          y1={home.y}
          x2={unit.x}
          y2={unit.y}
          className="stroke-rule-strong"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}

      {placed.map((point) => {
        const isHome = point.key === "cand";
        // Rótulo AO LADO do ponto, não acima: os três pontos costumam ficar
        // quase em linha, e um rótulo acima cai justamente sobre a linha que
        // liga um ao outro. Vira para a esquerda quando o ponto está na faixa
        // direita, senão o texto sai do viewBox.
        const toLeft = point.x > WIDTH - 74;
        return (
          <g key={point.key}>
            <circle
              cx={point.x}
              cy={point.y}
              r={isHome ? 5 : 4}
              className={isHome ? "fill-gold-text" : "fill-navy"}
            />
            <text
              x={point.x + (toLeft ? -9 : 9)}
              y={point.y + 3.5}
              textAnchor={toLeft ? "end" : "start"}
              className={cn(
                "text-[9.5px] font-semibold",
                isHome ? "fill-gold-text" : "fill-navy",
              )}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
