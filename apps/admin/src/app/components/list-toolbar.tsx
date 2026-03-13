'use client';

import type { ReactNode } from 'react';

import { Input } from './ui/input';
import { Button } from './ui/button';

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
    <div
      className="db-toolbar animate-page"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            className="db-input w-full max-w-md"
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
          size="md"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}

