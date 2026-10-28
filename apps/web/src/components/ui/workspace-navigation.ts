import type { LucideIcon } from 'lucide-react';
import { Archive, GalleryVerticalEnd, History, House, UserRound } from 'lucide-react';

export type WorkspaceNavigationItem = {
  href: '/app' | '/historico' | '/arquivados' | '/parques' | '/conta' | '/equipe';
  label: string;
  icon: LucideIcon;
};

export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  { href: '/app', label: 'Home', icon: House },
  { href: '/historico', label: 'Histórico', icon: History },
  { href: '/arquivados', label: 'Arquivados', icon: Archive },
  { href: '/parques', label: 'Parques', icon: GalleryVerticalEnd },
  { href: '/conta', label: 'Conta e configurações', icon: UserRound },
];
