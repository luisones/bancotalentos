"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveEvaluation } from "@/lib/actions/evaluations";
import { formatScore } from "@/lib/scoring";

type EvaluationFormProps = {
  applicationId: string;
  dimensionId: string;
  dimensionName: string;
  instrumentId?: string | null;
  initialScore?: number | null;
  initialComment?: string | null;
  disabled?: boolean;
};

export function EvaluationForm({
  applicationId,
  dimensionId,
  dimensionName,
  instrumentId,
  initialScore,
  initialComment,
  disabled,
}: EvaluationFormProps) {
  const [score, setScore] = useState(initialScore?.toString() ?? "");
  const [comment, setComment] = useState(initialComment ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(score);
    if (Number.isNaN(num) || num < 0 || num > 10) {
      setMessage("Nota deve ser entre 0 e 10.");
      return;
    }
    startTransition(async () => {
      try {
        await saveEvaluation({
          applicationId,
          dimensionId,
          instrumentId,
          score: num,
          comment: comment || null,
        });
        setMessage("Avaliação salva com sucesso.");
      } catch {
        setMessage("Erro ao salvar avaliação.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="liceu-card space-y-4 p-4">
      <h3 className="font-heading text-base font-semibold text-[var(--liceu-navy)]">
        {dimensionName}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`score-${dimensionId}`}>Nota (0–10)</Label>
          <Input
            id={`score-${dimensionId}`}
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            disabled={disabled || isPending}
            className="tabular-nums"
          />
          {score && !Number.isNaN(parseFloat(score)) && (
            <p className="text-xs text-muted-foreground">
              {formatScore(parseFloat(score))}
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`comment-${dimensionId}`}>Comentário</Label>
          <Textarea
            id={`comment-${dimensionId}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={disabled || isPending}
            rows={3}
            placeholder="Observações sobre esta dimensão..."
          />
        </div>
      </div>
      {message && (
        <p
          className={`text-sm ${message.includes("sucesso") ? "text-green-700" : "text-destructive"}`}
        >
          {message}
        </p>
      )}
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? "Salvando..." : "Salvar avaliação"}
      </Button>
    </form>
  );
}
