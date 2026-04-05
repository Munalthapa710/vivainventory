import {
  Boxes,
  ClipboardList,
  Cog,
  LayoutDashboard,
  MessageSquare,
  Users,
  Warehouse
} from "lucide-react";

export const linksByRole = {
  admin: [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users
    },
    {
      href: "/admin/warehouse",
      label: "Warehouse",
      icon: Warehouse
    },
    {
      href: "/admin/communication",
      label: "Communication",
      icon: MessageSquare
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Cog
    }
  ],
  employee: [
    {
      href: "/employee/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard
    },
    {
      href: "/employee/products",
      label: "Products",
      icon: Boxes
    },
    {
      href: "/employee/communication",
      label: "Communication",
      icon: MessageSquare
    },
    {
      href: "/employee/records",
      label: "Records",
      icon: ClipboardList
    },
    {
      href: "/employee/settings",
      label: "Settings",
      icon: Cog
    }
  ]
};

export function getNavigationLinks(role) {
  return linksByRole[role] || [];
}
