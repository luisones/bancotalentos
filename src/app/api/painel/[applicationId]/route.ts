import { NextResponse } from "next/server";
import { canWrite, getStaffUser } from "@/lib/auth/staff";
import { isUuid } from "@/lib/candidate/document-url";
import { getPainelDetail } from "@/lib/queries/painel-detail";

/**
 * Detalhe de uma candidatura, para os popovers do Painel.
 *
 * Route Handler e não server action pelo mesmo motivo de `/api/busca`: action é
 * POST e serializa, o que é errado para leitura disparada por interação. Aqui
 * ainda vale outra coisa — o island guarda a resposta por candidatura, e um GET
 * é o que o navegador sabe reaproveitar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ erro: "sem_sessao" }, { status: 401 });
  }

  const { applicationId } = await params;
  if (!isUuid(applicationId)) {
    return NextResponse.json({ erro: "requisicao_invalida" }, { status: 400 });
  }

  const detail = await getPainelDetail(
    applicationId,
    staff.id,
    canWrite(staff),
  );

  return NextResponse.json(detail);
}
