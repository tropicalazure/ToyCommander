
"use client";

import * as React from "react";
import { 
  Gamepad2, 
  Shield,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

const items = [
  {
    title: "Toy Control",
    url: "/toycontrols/local",
    icon: LayoutDashboard,
  },
  {
    title: "Experience Hub",
    url: "/games",
    icon: Gamepad2,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  
  // Hide sidebar on remote control pages for a focused partner experience
  if (pathname?.includes('/toycontrols/remote')) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar/50 backdrop-blur-xl">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center shrink-0">
            <Logo className="h-8 w-8" />
          </div>
          <div className="flex items-center group-data-[collapsible=icon]:hidden translate-y-[2px]">
            <span className="font-black font-headline text-lg leading-none tracking-tight text-white uppercase">
              Toy<span className="text-primary">Commander</span>
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title}
                  isActive={pathname === item.url}
                  className={cn(
                    "hover:bg-primary/10 transition-all duration-300 h-10 px-4",
                    pathname === item.url && "bg-primary/10 text-primary"
                  )}
                >
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span className="font-bold uppercase tracking-tight">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-border/50 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:justify-center">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground shrink-0 border border-accent/20">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-[10px] font-black text-white leading-none uppercase tracking-wider">Private Mode</span>
            <span className="text-[8px] text-primary font-bold uppercase tracking-widest mt-0.5">Secure Connection</span>
          </div>
        </div>
        
        <div className="flex w-full items-center justify-center border-t border-border/20 pt-4">
          <SidebarTrigger className="h-10 w-10 hover:bg-primary/20 hover:text-primary transition-all duration-300 rounded-lg text-muted-foreground" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
