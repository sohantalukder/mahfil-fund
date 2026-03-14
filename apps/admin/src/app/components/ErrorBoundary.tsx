'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/button';
import styles from '@/components/shared/shared.module.css';

type Props = { children: ReactNode; fallbackTitle?: string };

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'Unexpected error' };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.emptyState} role="alert">
          <p className={`${styles.errorBanner} ${styles.errorBannerSpaced}`}>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </p>
          <p className={styles.tableTitle}>{this.state.message}</p>
          <Button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
