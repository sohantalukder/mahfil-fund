export type MultipleSelectItem = { label: string; value: string };
export type MultipleSelectListProps = {
  data: MultipleSelectItem[];
  onSelect?: (values: string[]) => void;
};
