export { default } from "next-auth/middleware";

export const config = {
  // api/meta/callback must be public — the browser arrives here from
  // Facebook's redirect before a session cookie is re-established.
  matcher: ["/((?!api/auth|api/setup|api/meta/callback|_next/static|_next/image|favicon.ico|login).*)"],
};
