import { View, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useCallback } from 'react';
import { IconByVariant, Text, Divider } from '@/shared/components/atoms';
import { useTheme } from '@/theme';
import imagePickerService from '@/services/image-picker/image-picker.service';
import type { ImagePickerResult } from '@/services/image-picker/image-picker.service';
import { PencilIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';

interface Properties {
  readonly onConfirm: (result: ImagePickerResult) => void;
  readonly isLoading?: boolean;
}

const UpdateImageBottomSheet: React.FC<Properties> = ({ onConfirm, isLoading = false }) => {
  const { colors, gutters } = useTheme();

  const handleImageSelection = useCallback(
    async (source: 'camera' | 'gallery') => {
      if (isLoading) return;
      const result =
        source === 'camera'
          ? await imagePickerService.openCamera()
          : await imagePickerService.pickImage();
      if (result) {
        onConfirm(result);
      }
    },
    [isLoading, onConfirm]
  );

  const options = [
    {
      icon: 'camera',
      label: 'Take Photo',
      sublabel: 'Use your camera',
      source: 'camera' as const,
    },
    {
      icon: 'gallery',
      label: 'Choose from Library',
      sublabel: 'Pick from your photos',
      source: 'gallery' as const,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Sheet title */}
      <View style={styles.titleRow}>
        <View style={[styles.titleIcon, { backgroundColor: colors.primary + '18' }]}>
          <PencilIcon color={colors.primary} size={rs(18)} />
        </View>
        <Text variant="body1" weight="bold">
          Update Profile Photo
        </Text>
      </View>

      <Text variant="body3" color="secondary" style={gutters.marginBottom_20}>
        Choose how you'd like to update your profile picture.
      </Text>

      {options.map((opt, i) => (
        <View key={opt.source}>
          {i > 0 && <Divider style={styles.divider} />}
          <TouchableOpacity
            activeOpacity={isLoading ? 1 : 0.7}
            onPress={() => void handleImageSelection(opt.source)}
            disabled={isLoading}
            style={[styles.optionRow, isLoading && styles.disabled]}
          >
            <View style={[styles.optionIcon, { backgroundColor: colors.gray8 }]}>
              <IconByVariant path={opt.icon} height={rs(26)} width={rs(26)} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text variant="body2" weight="semibold">
                {isLoading ? 'Uploading…' : opt.label}
              </Text>
              <Text variant="body3" color="secondary">
                {opt.sublabel}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ))}

      <View style={gutters.marginBottom_24} />
    </View>
  );
};

export default UpdateImageBottomSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  titleIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    marginVertical: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  optionIcon: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
