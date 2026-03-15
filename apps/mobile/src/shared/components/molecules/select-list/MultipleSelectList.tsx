import { View } from 'react-native';
import Text from '@/shared/components/atoms/text/Text';
import type { MultipleSelectListProps } from './types/multiple-select-list.type';

/** Placeholder — full multi-select UI can be added later */
export default function MultipleSelectList({ data }: MultipleSelectListProps) {
  return (
    <View>
      {data.map((item) => (
        <Text key={item.value}>{item.label}</Text>
      ))}
    </View>
  );
}
