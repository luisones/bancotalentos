import { Button } from "@/components/ui/button";
import { Chip, StateBadge } from "@/components/liceu/chip";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import {
  DefinitionList,
  FieldBlock,
  FieldGrid,
} from "@/components/liceu/field-block";
import { Kpi, KpiStrip } from "@/components/liceu/kpi-strip";
import { ColumnChart, MeterBar, NoteBox } from "@/components/liceu/meter";
import {
  ScoreWithCoverage,
  TalentClassification,
} from "@/components/liceu/score-with-coverage";
import {
  ExpandAllControls,
  Section,
  SectionAccordion,
} from "@/components/liceu/section-accordion";
import { Segmented } from "@/components/liceu/segmented";
import {
  BlindState,
  EmptyState,
  ErrorState,
  NoScoreState,
  RestrictedState,
} from "@/components/liceu/states";
import { MicroHeader, Panel, PanelHeader } from "@/components/liceu/surface";
import { QuickNoteLine } from "@/components/liceu/quick-note";
import { requireStaff } from "@/lib/auth/staff";
import { TONES } from "./tones";

export const dynamic = "force-dynamic";

/**
 * Página-espécime: o portão de verificação da fundação.
 *
 * Renderiza todo token, todo componente em todo tom e — o que mais importa —
 * TODO ESTADO, incluindo os não-felizes. É o que torna a regra "nenhum
 * componente sem seus estados" verificável em vez de aspiracional.
 *
 * Conferir a 375 / 768 / 1280 / 1560px e em preview de impressão.
 */
export default async function DesignSystemPage() {
  await requireStaff(["admin"]);

  return (
    <div className="flex flex-col gap-8 pb-16 pt-6">
      <header>
        <h1 className="font-heading text-h1 font-bold tracking-[-0.02em] text-navy">
          Sistema de design
        </h1>
        <p className="text-dense mt-1 text-muted-foreground">
          Especímenes de token, componente e estado. Uso interno.
        </p>
      </header>

      <Specimen title="Paleta semântica — sempre em trio">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TONES.map((tone) => (
            <div key={tone} className="flex flex-col gap-2">
              <StateBadge tone={tone} dot>
                {tone}
              </StateBadge>
              <MeterBar value={7.4} tone={tone} display="7,4" />
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Escala tipográfica">
        <div className="flex flex-col gap-1.5">
          <p className="font-heading text-h1 font-bold tracking-[-0.02em] text-navy">
            h1 · Renata Sartori Albuquerque
          </p>
          <p className="font-heading text-metric font-bold text-navy" data-numeric>
            metric · 7,4
          </p>
          <p className="font-heading text-display-sm font-bold">display-sm</p>
          <p className="font-heading text-title font-bold text-navy">
            title · título de seção
          </p>
          <p className="text-title-sm font-semibold">title-sm</p>
          <p className="text-row">row · texto primário de célula</p>
          <p className="text-cell">cell</p>
          <p className="text-dense text-muted-foreground">
            dense · o corpo desta UI, 13px no celular e 12,5px em md+
          </p>
          <p className="text-note text-muted-foreground">note</p>
          <p className="text-tag text-label">tag</p>
          <p className="text-meta text-subtle">meta</p>
          <p className="text-eyebrow font-bold uppercase tracking-eyebrow text-gold-text">
            eyebrow · nomeia escopo, nunca repete o título
          </p>
          <p className="text-micro font-bold uppercase tracking-micro text-label">
            micro · header de bloco
          </p>
        </div>
      </Specimen>

      <Specimen title="Nota rápida">
        <QuickNoteLine note="já foi nossa professora · saiu em 2022 para o doutorado" />
        <QuickNoteLine note="é estagiário no momento" />
        <p className="text-meta mt-2 text-subtle">
          Variante de lista, truncada em uma linha. A editável vive no card de
          identidade.
        </p>
      </Specimen>

      <Specimen title="Resultado com cobertura — e a classificação, separada">
        <div className="grid gap-6 sm:grid-cols-3">
          <ScoreWithCoverage
            consolidated={7.4}
            coverage={5}
            totalDimensions={8}
            missing={["Prova de conteúdo", "Entrevista", "Aula-teste"]}
            size="kpi"
          />
          <ScoreWithCoverage
            consolidated={8.9}
            coverage={8}
            totalDimensions={8}
            size="kpi"
          />
          <ScoreWithCoverage
            consolidated={null}
            coverage={0}
            totalDimensions={8}
            size="kpi"
          />
        </div>
        <hr className="my-4 border-rule" />
        <TalentClassification label="Forte candidato" />
        <p className="text-meta mt-2 text-subtle">
          Source Sans e tinto gold, nunca Archivo tabular — a regra 17 precisa
          ser legível num relance. Nunca na mesma linha do número.
        </p>
      </Specimen>

      <Specimen title="KPI strip — hairlines por gap">
        <KpiStrip>
          <Kpi value="7,4" label="Resultado consolidado" note="sobre 5 de 8 dimensões" />
          <Kpi value="5/8" label="Cobertura" note="3 sem nenhuma avaliação" tone="gold" />
          <Kpi value="3" label="Pendentes suas" note="Prova, Entrevista, Aula-teste" tone="alert" />
          <Kpi value="4" label="Avaliadores" note="11 registros individuais" />
          <Kpi value="3" label="Candidaturas" note="em 2 campanhas desde 2024" />
          <Kpi value="12 d" label="Última movimentação" note="avaliação em 21/03" tone="neutral" />
        </KpiStrip>
      </Specimen>

      <Specimen title="Blocos rótulo→valor, com ação inline">
        <FieldGrid>
          <FieldBlock
            title="Situação seletiva"
            items={[{ label: "Decisão", value: "Avançar", tone: "positive" }]}
            action={{ label: "alterar decisão", href: "#" }}
          />
          <FieldBlock
            title="Etapa operacional"
            items={[{ label: "Agora", value: "Aula-teste agendada" }]}
            action={{ label: "avançar etapa", href: "#" }}
          />
          <FieldBlock
            title="Contato"
            items={[
              { label: "E-mail", value: "r…@exemplo.com" },
              { label: "Telefone", value: "(19) 9…-4412" },
            ]}
            action={{ label: "histórico de contatos", href: "#" }}
          />
        </FieldGrid>
      </Specimen>

      <Specimen title="Chips e badges de estado">
        <div className="flex flex-wrap gap-2">
          <Chip>História</Chip>
          <Chip>Campinas SP</Chip>
          <Chip>Inglês B2</Chip>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StateBadge tone="alert">3 pendentes suas</StateBadge>
          <StateBadge tone="positive">Sua avaliação completa</StateBadge>
          <StateBadge tone="alert">Sem currículo</StateBadge>
          <StateBadge tone="gold">Aguardando retorno</StateBadge>
          <StateBadge tone="neutral">Importado</StateBadge>
          <StateBadge tone="navy">Confidencial</StateBadge>
        </div>
      </Specimen>

      <Specimen title="Botões — três intenções">
        <div className="flex max-w-[240px] flex-col gap-2">
          <Button size="stack">Avaliar candidato · 3 pendentes</Button>
          <Button size="stack" variant="outline">
            Registrar contato
          </Button>
          <Button size="stack" variant="gold">
            Montar impressão
          </Button>
        </div>
      </Specimen>

      <Specimen title="Tabela em CSS grid">
        <DataGrid
          columns={[
            { key: "d", label: "Dimensão", width: "minmax(190px,1fr)" },
            { key: "n", label: "Nota", width: "92px", align: "center", numeric: true },
            { key: "a", label: "Avaliadores", width: "110px", align: "center", numeric: true },
            { key: "s", label: "Situação", width: "120px", align: "end" },
          ]}
          caption="Clique em uma dimensão para ver as avaliações"
        >
          <DataGridRow
            href="#"
            cells={[
              <Cell key="d">Didática humana</Cell>,
              <Cell key="n" align="center" numeric stackLabel="Nota">
                8,1
              </Cell>,
              <Cell key="a" align="center" numeric stackLabel="Avaliadores">
                3
              </Cell>,
              <Cell key="s" align="end" stackLabel="Situação">
                Avaliada
              </Cell>,
            ]}
          />
          <DataGridRow
            href="#"
            tone="alert"
            cells={[
              <Cell key="d">Prova de conteúdo</Cell>,
              <Cell key="n" align="center" stackLabel="Nota">
                <NoScoreState />
              </Cell>,
              <Cell key="a" align="center" numeric muted stackLabel="Avaliadores">
                0
              </Cell>,
              <Cell key="s" align="end" muted stackLabel="Situação">
                Pendente
              </Cell>,
            ]}
          />
        </DataGrid>
      </Specimen>

      <Specimen title="As duas formas de gráfico permitidas">
        <MicroHeader>MeterBar · valor contra escala conhecida</MicroHeader>
        <div className="flex max-w-md flex-col gap-2">
          <MeterBar value={8.1} display="8,1" tone="positive" />
          <MeterBar value={5.2} display="5,2" tone="gold" marker={6} markerLabel="média da coorte" />
          <MeterBar value={null} display="—" />
        </div>
        <div className="mt-6 max-w-md">
          <MicroHeader>ColumnChart · dispersão entre avaliadores, n ≥ 3</MicroHeader>
          <ColumnChart
            unit="nota por avaliador"
            max={10}
            series={[
              { label: "A. Lima", value: 8.5, display: "8,5" },
              { label: "B. Souza", value: 6.0, display: "6,0", tone: "gold" },
              { label: "C. Dias", value: 9.0, display: "9,0" },
            ]}
          />
        </div>
        <NoteBox tone="gold" source="calculado sobre 3 avaliações · pesos de 12/03/2026" className="mt-6">
          A dispersão entre avaliadores nesta dimensão é de 3,0 pontos — a maior
          do processo.
        </NoteBox>
      </Specimen>

      <Specimen title="Estados não-felizes">
        <div className="flex flex-col gap-4">
          <EmptyState
            title="Nenhuma dimensão avaliada ainda."
            hint="As 8 dimensões previstas aparecem abaixo. Dimensão sem avaliação não vale zero — ela fica fora do cálculo e reduz a cobertura."
            action={{ label: "Avaliar candidato", href: "#" }}
          />
          <BlindState
            hiddenCount={2}
            dimensionName="Didática humana"
            onEvaluate={<Button size="sm">Avaliar agora</Button>}
            onPeek={
              <Button size="sm" variant="outline">
                Revelar antes de avaliar
              </Button>
            }
          />
          <RestrictedState reason="Seu perfil é de consulta: você vê os registros mas não avalia." />
          <ErrorState
            title="Não conseguimos carregar as avaliações."
            detail="O resto do perfil continua utilizável."
            retry={
              <Button size="sm" variant="outline">
                Tentar de novo
              </Button>
            }
          />
        </div>
      </Specimen>

      <Specimen title="Controle segmentado / candidatura em foco">
        <Segmented
          value="a"
          hrefFor={() => "#"}
          items={[
            { value: "a", label: "EFAF-EM 2025 · História", sub: "7,4 · 5/8 · Avançar" },
            { value: "b", label: "EFAF-EM 2024 · História", sub: "6,1 · 8/8 · Não avançar" },
            { value: "c", label: "Manual · sem campanha", sub: "— · 0/8 · Em avaliação" },
          ]}
        />
      </Specimen>

      <Specimen title="Pares rótulo/valor (modal e impressão)">
        <DefinitionList
          rows={[
            { label: "Campanha", value: "EFAF-EM 2025" },
            { label: "Disciplina", value: "História" },
            { label: "Inscrição", value: "08/02/2026" },
          ]}
        />
      </Specimen>

      <Specimen title="Acordeão">
        <SectionAccordion
          sections={["esp-1", "esp-2", "esp-3"]}
          defaultOpen={["esp-1"]}
          persist={false}
        >
          <ExpandAllControls />
          <Section
            id="esp-1"
            tone="navy"
            title="Avaliação e resultado"
            scope="EFAF-EM 2025 · História"
            badge={{ label: "3 pendentes suas", tone: "alert" }}
            summary={[
              { text: "7,4 consolidado", strong: true },
              { text: "5 de 8 dimensões avaliadas" },
              { text: "4 avaliadores" },
              { text: "3 pendentes suas", tone: "alert" },
            ]}
          >
            <p className="text-dense text-muted-foreground">
              Corpo renderizado no servidor. Nunca desmonta — alterna `hidden`,
              então o Ctrl+F do navegador encontra este texto com a seção
              fechada, e a impressão força tudo aberto.
            </p>
          </Section>
          <Section
            id="esp-2"
            tone="positive"
            title="Currículo, vídeo e materiais"
            summary={[
              { text: "1 currículo" },
              { text: "1 vídeo" },
              { text: "sem gravação de entrevista", tone: "alert" },
            ]}
          >
            <p className="text-dense text-muted-foreground">Segunda seção.</p>
          </Section>
          <Section
            id="esp-3"
            tone="alert"
            title="Saúde e restrições"
            badge={{ label: "Acesso restrito", tone: "alert" }}
            summary={[{ text: "conteúdo bloqueado para o seu perfil" }]}
            locked={{
              reason:
                "Esta seção exige perfil de administrador. Fale com a direção se precisar de acesso.",
            }}
          >
            <p>Nunca renderizado.</p>
          </Section>
        </SectionAccordion>
      </Specimen>

      <Specimen title="Superfície com destaque">
        <Panel accent="alert" padding="none">
          <PanelHeader
            eyebrow="Pontos de atenção"
            eyebrowTone="alert"
            right="Visível apenas para perfis com escrita"
          />
          <div className="grid gap-px bg-rule [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {[
              "Sem currículo anexado",
              "3 dimensões sem avaliação",
              "Contato vencido em 12/03",
            ].map((t) => (
              <div key={t} className="bg-card px-4 py-3.5">
                <StateBadge tone="alert" dot>
                  pendência
                </StateBadge>
                <p className="text-row mt-1.5 font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </Panel>
      </Specimen>
    </div>
  );
}

function Specimen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-title mb-3 font-bold text-navy">
        {title}
      </h2>
      <Panel>{children}</Panel>
    </section>
  );
}
