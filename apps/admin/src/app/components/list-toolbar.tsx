'use client';

import type { ReactNode } from 'react';

import { Input } from './ui/input';
import { Button } from './ui/button';
import styles from './list-toolbar.module.css';

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
    <div className={styles.root}>
      <div className={styles.left}>
        <div className={styles.searchWrap}>
          <Input
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
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
