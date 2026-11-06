export const ADMIN_EMAIL = "mohammedafroz125@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}