"use client";

import Image from "next/image";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  async function handleSignIn() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
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
          priority
        />
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--liceu-navy)]">
            Banco de Talentos Docentes
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesso restrito à equipe do Liceu Jardim
          </p>
        </div>
        <Button
          onClick={handleSignIn}
          className="w-full bg-[var(--liceu-navy)] hover:bg-[var(--liceu-navy-hover)]"
          size="lg"
        >
          Entrar com Google Workspace
        </Button>
      </div>
    </div>
  );
}
