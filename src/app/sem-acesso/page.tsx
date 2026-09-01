"use client";

import Image from "next/image";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export default function SemAcessoPage() {
  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/auth/sign-in";
        },
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--liceu-bg)] px-4">
      <div className="liceu-card w-full max-w-md space-y-6 p-8 text-center">
        <Image
          src="/logo-liceu-navy.png"
          alt="Liceu Jardim"
          width={180}
          height={48}
          className="mx-auto h-12 w-auto"
        />
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--liceu-navy)]">
            Acesso negado
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não está autorizada a acessar o Banco de Talentos. Entre
            em contato com a administração se acredita que isso é um erro.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full"
        >
          Sair e tentar outra conta
        </Button>
      </div>
    </div>
  );
}
