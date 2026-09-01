import { redirect } from "next/navigation";
import { createCandidate } from "@/lib/actions/candidates";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { campaigns, disciplines } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export default async function NovoCandidatoPage() {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) redirect("/sem-acesso");

  const [allCampaigns, allDisciplines] = await Promise.all([
    db.select().from(campaigns),
    db.select().from(disciplines).orderBy(asc(disciplines.name)),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    const result = await createCandidate({
      fullName: formData.get("fullName") as string,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      city: (formData.get("city") as string) || undefined,
      englishLevel: (formData.get("englishLevel") as string) || undefined,
      disciplineId: (formData.get("disciplineId") as string) || undefined,
      campaignId: (formData.get("campaignId") as string) || undefined,
      candidateObservation:
        (formData.get("candidateObservation") as string) || undefined,
      differentialText: (formData.get("differentialText") as string) || undefined,
    });
    redirect(`/candidatos/${result.candidateId}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
          Novo candidato
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastro manual de candidato e candidatura
        </p>
      </div>

      <form action={handleCreate} className="liceu-card space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome completo *</Label>
          <Input id="fullName" name="fullName" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" name="phone" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="englishLevel">Nível de inglês</Label>
            <Input id="englishLevel" name="englishLevel" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaignId">Campanha</Label>
            <select
              id="campaignId"
              name="campaignId"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">—</option>
              {allCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="disciplineId">Disciplina</Label>
            <select
              id="disciplineId"
              name="disciplineId"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">—</option>
              {allDisciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="candidateObservation">Observação do candidato</Label>
          <Textarea id="candidateObservation" name="candidateObservation" rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="differentialText">Diferencial</Label>
          <Textarea id="differentialText" name="differentialText" rows={3} />
        </div>

        <Button type="submit">Criar candidato</Button>
      </form>
    </div>
  );
}
