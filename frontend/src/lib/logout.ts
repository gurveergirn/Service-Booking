/** Clear auth cookies and do a full reload so server-rendered UI drops the session. */
export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
}
