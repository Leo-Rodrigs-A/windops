import type { LucideIcon } from 'lucide-react';
import { GalleryVerticalEnd, History, House, UserRound } from 'lucide-react';

export type WorkspaceNavigationItem = {
  href: '/app' | '/historico' | '/parques' | '/conta' | '/equipe';
  label: string;
  icon: LucideIcon;
};

export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  { href: '/app', label: 'Home', icon: House },
  { href: '/historico', label: 'Histórico', icon: History },
  { href: '/parques', label: 'Parques', icon: GalleryVerticalEnd },
  { href: '/conta', label: 'Conta e configurações', icon: UserRound },
];
