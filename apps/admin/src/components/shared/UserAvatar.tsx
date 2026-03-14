import { cn } from '@/lib/utils';
import styles from './shared.module.css';
import { getAvatarColor, getInitials } from '@/constants/payments';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: styles.avatarSm,
  md: styles.avatarMd,
  lg: styles.avatarLg,
};

type Props = {
  name: string;
  size?: Size;
  className?: string;
};

export function UserAvatar({ name, size = 'sm', className }: Props) {
  const initials = getInitials(name);
  const bg = getAvatarColor(name);

  return (
    <span
      className={cn(styles.avatar, SIZE_CLASS[size], className)}
      style={{ background: bg }}
      title={name}
    >
      {initials}
    </span>
  );
}
