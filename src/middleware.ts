import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    "/((?!auth|api/auth|sem-acesso|_next/static|_next/image|favicon.ico|logo|simbolo).*)",
  ],
};
