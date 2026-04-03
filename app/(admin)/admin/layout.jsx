import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/employee/dashboard");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
