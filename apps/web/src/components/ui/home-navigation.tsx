import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export type HomeNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function HomeNavigation({
  items,
  activeHref,
  className,
}: {
  items: HomeNavigationItem[];
  activeHref: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className={cn('min-h-[67px] border-t border-border bg-surface', className)}
    >
      <ul className="mx-auto flex min-h-[67px] w-full max-w-screen-xl items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <li className="flex flex-1" key={href}>
              <Button
                asChild
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className={cn(
                  'h-full min-h-[67px] w-full rounded-none border-t-[3px] border-transparent text-muted-foreground hover:text-foreground',
                  active && 'border-t-foreground text-foreground',
                )}
                size="icon"
                variant="ghost"
              >
                <a href={href}>
                  <Icon aria-hidden="true" size={20} strokeWidth={2} />
                </a>
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
