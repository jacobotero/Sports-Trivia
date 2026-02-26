import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return null;
  if (!session?.user?.email) return null;
  if (session.user.email !== adminEmail) return null;
  return session;
}
