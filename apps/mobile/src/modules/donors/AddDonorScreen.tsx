// FILE: /sessions/nice-sweet-cori/mnt/Mahfil Fund/apps/mobile/src/modules/donors/AddDonorScreen.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';

interface DonorFormData {
  name: string;
  phone: string;
  altPhone: string;
  address: string;
  donorType: 'INDIVIDUAL' | 'ORGANIZATION';
  note: string;
}

interface DonorRow {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  address?: string;
  donorType: 'INDIVIDUAL' | 'ORGANIZATION';
  note?: string;
}

const AddDonorScreen: React.FC = () => {
  const { colors, gutters, layout } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();

  const donorToEdit = route.params?.donor as DonorRow | undefined;
  const isEditMode = !!donorToEdit;

  const [formData, setFormData] = useState<DonorFormData>({
    name: donorToEdit?.name || '',
    phone: donorToEdit?.phone || '',
    altPhone: donorToEdit?.altPhone || '',
    address: donorToEdit?.address || '',
    donorType: donorToEdit?.donorType || 'INDIVIDUAL',
    note: donorToEdit?.note || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DonorFormData, string>>>({});

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: rs(16),
          paddingVertical: rs(12),
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
        headerTitle: {
          flex: 1,
          marginLeft: rs(12),
        },
        content: {
          paddingHorizontal: rs(16),
          paddingVertical: rs(16),
          gap: rs(16),
        },
        typeSelector: {
          flexDirection: 'row',
          gap: rs(12),
        },
        typeButton: {
          flex: 1,
          paddingVertical: rs(12),
          borderRadius: rs(8),
          borderWidth: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        typeButtonActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        typeButtonInactive: {
          borderColor: colors.divider,
          backgroundColor: colors.white,
        },
        footer: {
          paddingHorizontal: rs(16),
          paddingBottom: rs(24),
          gap: rs(12),
        },
      }),
    [colors],
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof DonorFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const { mutate: saveDonor, isPending } = useMutation({
    mutationFn: async () => {
      const api = getApi();
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        altPhone: formData.altPhone.trim() || undefined,
        address: formData.address.trim() || undefined,
        donorType: formData.donorType,
        note: formData.note.trim() || undefined,
      };

      if (isEditMode) {
        await api.put(`/donors/${donorToEdit.id}`, payload);
      } else {
        await api.post('/donors', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      navigation.goBack();
    },
    onError: (err) => {
      console.error('Save donor error:', err);
    },
  });

  const handleSave = useCallback(() => {
    if (validateForm()) {
      saveDonor();
    }
  }, [validateForm, saveDonor]);

  const updateFormData = useCallback(<K extends keyof DonorFormData>(key: K, value: DonorFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowBackIcon width={rs(24)} height={rs(24)} color={colors.primary} />
        </TouchableOpacity>
        <Text variant="heading2" style={styles.headerTitle}>
          {isEditMode ? 'Edit Donor' : 'Add Donor'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          label="Full Name *"
          placeholder="Enter full name"
          value={formData.name}
          onChangeText={(text) => updateFormData('name', text)}
          errorMessage={errors.name}
        />

        <TextInput
          label="Phone"
          placeholder="+880 1234567890"
          value={formData.phone}
          onChangeText={(text) => updateFormData('phone', text)}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Alternative Phone"
          placeholder="+880 1234567890"
          value={formData.altPhone}
          onChangeText={(text) => updateFormData('altPhone', text)}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Address"
          placeholder="Enter address"
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
        />

        <View>
          <Text variant="body2" color="primary" style={gutters.marginBottom_8}>
            Donor Type
          </Text>
          <View style={styles.typeSelector}>
            {(['INDIVIDUAL', 'ORGANIZATION'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  formData.donorType === type ? styles.typeButtonActive : styles.typeButtonInactive,
                ]}
                onPress={() => updateFormData('donorType', type)}
              >
                <Text
                  variant="body2"
                  color={formData.donorType === type ? 'white' : 'primary'}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TextInput
          label="Note"
          placeholder="Add any additional notes"
          value={formData.note}
          onChangeText={(text) => updateFormData('note', text)}
          wrapperStyle={{ minHeight: rs(100) }}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          text={isEditMode ? 'Update Donor' : 'Create Donor'}
          onPress={handleSave}
          isLoading={isPending}
          variant="primary"
        />
      </View>
    </SafeScreen>
  );
};

export default AddDonorScreen;
