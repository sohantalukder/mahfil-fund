export type ContextMenuItem = {
  id?: string;
  title?: string;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  checked?: boolean;
  icon?: string;
  iconColor?: string;
  separator?: boolean;
};

export type ContextMenuSection = {
  id?: string;
  title?: string;
  items?: ContextMenuItem[];
  data?: ContextMenuItem[];
};

export type ContextMenuConfig = {
  title?: string;
  subtitle?: string;
  maxWidth?: number;
  showIcons?: boolean;
  items?: ContextMenuItem[];
  sections?: ContextMenuSection[];
  position?: 'auto' | 'above' | 'below' | { x: number; y: number };
  triggerBounds?: { x: number; y: number; width: number; height: number };
  dismissOnSelect?: boolean;
};

export type ContextMenuConfigWithKey = ContextMenuConfig & {
  key?: string;
  position?: ContextMenuConfig['position'];
  triggerBounds?: ContextMenuConfig['triggerBounds'];
  dismissOnSelect?: boolean;
};
