'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import styles from './shared.module.css';

type PrimaryAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export type ListToolbarProps = {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  primaryAction?: PrimaryAction;
  children?: ReactNode;
};

export function ListToolbar({
  searchPlaceholder = 'Search…',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  primaryAction,
  children,
}: ListToolbarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearchSubmit) {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <Input
          className="max-w-xs"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {children}
      </div>
      {primaryAction && (
        <Button
          type="button"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}
