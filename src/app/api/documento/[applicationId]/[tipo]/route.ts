import { NextResponse } from "next/server";
import { getStaffUser } from "@/lib/auth/staff";
import { isDocumentKind, isUuid } from "@/lib/candidate/document-url";
import { findDocumentUrl } from "@/lib/queries/cached-data";

/**
 * Redireciona para o currículo ou o vídeo de uma candidatura.
 *
 * Existe para manter as URLs FORA do payload do Painel: 707 candidaturas × 2
 * endereços são ~110KB de RSC para links que quase nunca são clicados. A linha
 * carrega só um booleano (`hasCurriculo` / `hasVideo`), e o endereço é resolvido
 * no clique.
 *
 * O documento é interno: sem sessão de equipe, 401 — e não um redirecionamento
 * para um Drive que responderia com a própria tela de login e daria a impressão
 * de que o link é público.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string; tipo: string }> },
) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ erro: "sem_sessao" }, { status: 401 });
  }

  const { applicationId, tipo } = await params;
  if (!isDocumentKind(tipo) || !isUuid(applicationId)) {
    return NextResponse.json({ erro: "requisicao_invalida" }, { status: 400 });
  }

  const url = await findDocumentUrl(applicationId, tipo);
  if (!url) {
    return NextResponse.json({ erro: "sem_documento" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
