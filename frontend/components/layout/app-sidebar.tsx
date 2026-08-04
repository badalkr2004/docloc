"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiArchive2Line,
  RiShieldKeyholeLine,
  RiShoppingCart2Line,
  RiShareForwardLine,
  RiHistoryLine,
  RiSettings3Line,
  RiFolder3Line,
} from "@remixicon/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainNav = [
  { label: "Vault", href: "/vault", icon: RiShieldKeyholeLine },
  { label: "Buckets", href: "/buckets", icon: RiFolder3Line },
  { label: "Cart", href: "/cart", icon: RiShoppingCart2Line },
  { label: "Shares", href: "/shares", icon: RiShareForwardLine },
];

const secondaryNav = [
  { label: "Audit Log", href: "/audit", icon: RiHistoryLine },
  { label: "Settings", href: "/settings", icon: RiSettings3Line },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2">
        <Link href="/vault" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <RiArchive2Line className="text-primary shrink-0" size={24} />
          <span className="font-heading text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Docloc
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-muted-foreground">
          End-to-end encrypted
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
