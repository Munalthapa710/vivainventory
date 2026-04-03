import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { authOptions } from "@/lib/auth";

export default async function EmployeeLayout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "employee") {
    redirect("/admin/dashboard");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
