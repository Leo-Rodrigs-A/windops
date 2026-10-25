import { Link } from '@tanstack/react-router';
import { type LucideIcon, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from './sidebar';

export type WorkspaceNavigationItem = {
  href: '/app' | '/equipe';
  label: string;
  icon: LucideIcon;
};

export function WorkspaceSidebarLayout({
  workspaceName,
  items,
  activeHref,
  children,
}: {
  workspaceName: string;
  items: WorkspaceNavigationItem[];
  activeHref: string;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="gap-4 p-4">
          <div className="flex items-center gap-3 px-2 py-1">
            <Wind aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold">Wind Ops</span>
          </div>
          <div className="min-w-0 px-2">
            <p className="text-xs text-muted-foreground">Workspace</p>
            <p className="truncate text-sm font-medium">{workspaceName}</p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={href === activeHref} tooltip={label}>
                      <Link to={href}>
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <p className="truncate px-2 text-xs text-muted-foreground">Acesso ao workspace</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
