import { currentUser } from '@clerk/nextjs/server';

export async function getCurrentEmail(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const primary = user.emailAddresses?.find(
    (e) => e.id === user.primaryEmailAddressId
  );
  return primary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
}

export async function isAdminUser(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const email = await getCurrentEmail();
  return email === adminEmail;
}
