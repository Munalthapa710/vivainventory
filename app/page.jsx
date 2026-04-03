import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, getDashboardPath } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  redirect(getDashboardPath(session.user.role));
}
