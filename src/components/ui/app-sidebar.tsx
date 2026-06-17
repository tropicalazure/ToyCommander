
"use client";

import * as React from "react";
import { 
  Gamepad2, 
  Shield,
  LayoutDashboard,
  Users,
  LogIn,
  LogOut,
  Edit2,
  Loader2,
  Lock
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ProfileDialog } from "@/components/ui/profile-dialog";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getAvatarColorClass } from "@/lib/avatar";
import { Logo } from "@/components/ui/logo";

export function AppSidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const { setOpenMobile, isMobile } = useSidebar();
  const { user, profile, loading, signOut } = useAuth();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const menuItems = React.useMemo(() => {
    return [
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
      {
        title: "Partners",
        url: user ? "/partners" : "/login",
        icon: Users,
        locked: !user,
      },
    ];
  }, [user]);

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
            {menuItems.map((item) => (
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
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="font-bold uppercase tracking-tight">{item.title}</span>
                    {item.locked && (
                      <Lock className="h-3.5 w-3.5 ml-auto text-primary/70 group-data-[collapsible=icon]:hidden" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex justify-center items-center h-10">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        ) : user && profile ? (
          /* Authenticated User Widget */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-2 rounded-2xl hover:bg-muted/30 border border-border/50 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:justify-center w-full text-left outline-none transition-all">
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-xl shrink-0 transition-all duration-300",
                  getAvatarColorClass(profile.avatarColor)
                )}>
                  {profile.avatarEmoji}
                </div>
                <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden flex-1 min-w-0 pr-1">
                  <span className="text-xs font-black text-white truncate uppercase tracking-tight leading-none">
                    {profile.displayName}
                  </span>
                  <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest mt-1">
                    Online
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-card border-border rounded-xl z-[120]" align="end" side="top">
              <DropdownMenuItem 
                onClick={() => setEditProfileOpen(true)}
                className="hover:bg-primary/10 hover:text-primary cursor-pointer text-xs font-bold uppercase tracking-tight p-2.5 flex items-center"
              >
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={() => signOut()}
                className="hover:bg-destructive/10 hover:text-destructive cursor-pointer text-xs font-bold uppercase tracking-tight p-2.5 flex items-center"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* Unauthenticated Sign In Button */
          <Button 
            asChild 
            className="w-full bg-primary hover:bg-primary/95 text-white font-black uppercase text-xs rounded-xl h-10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 transition-all shadow-[0_4px_15px_rgba(255,0,255,0.15)]"
          >
            <Link href="/login" className="flex items-center justify-center">
              <LogIn className="h-4 w-4 mr-2 group-data-[collapsible=icon]:mr-0 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Sign In</span>
            </Link>
          </Button>
        )}
        
        {/* Sidebar Collapse Button */}
        <div className="flex w-full items-center justify-center border-t border-border/20 pt-4">
          <SidebarTrigger className="h-10 w-10 hover:bg-primary/20 hover:text-primary transition-all duration-300 rounded-lg text-muted-foreground" />
        </div>
      </SidebarFooter>
      <SidebarRail />

      {/* Edit Profile modal */}
      {user && (
        <ProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      )}
    </Sidebar>
  );
}

