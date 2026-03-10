export type MultipleSelectItem = {
  label: string;
  value: string;
};

export type MultipleSelectListProps = {
  items: MultipleSelectItem[];
  values: string[];
  onChange: (values: string[]) => void;
};

