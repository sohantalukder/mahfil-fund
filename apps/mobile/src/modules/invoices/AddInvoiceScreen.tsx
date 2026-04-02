// FILE: /sessions/nice-sweet-cori/mnt/Mahfil Fund/apps/mobile/src/modules/invoices/AddInvoiceScreen.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminApi } from '@/api/client';
import { useTheme } from '@/theme';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import { ArrowBackIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import rs from '@/shared/utilities/responsiveSize';

interface InvoiceFormData {
  payerName: string;
  amount: string;
  paymentMethod: 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';
  issueDate: string;
  referenceNumber: string;
  phone: string;
  address: string;
  note: string;
  invoiceType: 'DONATION_RECEIPT' | 'SPONSOR_RECEIPT' | 'MANUAL';
}

const AddInvoiceScreen: React.FC = () => {
  const { colors, gutters, layout } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<InvoiceFormData>({
    payerName: '',
    amount: '',
    paymentMethod: 'CASH',
    issueDate: today,
    referenceNumber: '',
    phone: '',
    address: '',
    note: '',
    invoiceType: 'DONATION_RECEIPT',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof InvoiceFormData, string>>>({});

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
        sectionLabel: {
          marginTop: rs(8),
          marginBottom: rs(12),
        },
        paymentMethodRow: {
          flexDirection: 'row',
          gap: rs(8),
          flexWrap: 'wrap',
        },
        paymentButton: {
          paddingHorizontal: rs(12),
          paddingVertical: rs(8),
          borderRadius: rs(6),
          borderWidth: 2,
          justifyContent: 'center',
          alignItems: 'center',
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
    const newErrors: Partial<Record<keyof InvoiceFormData, string>> = {};

    if (!formData.payerName.trim()) {
      newErrors.payerName = 'Payer name is required';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(formData.amount))) {
      newErrors.amount = 'Amount must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const { mutate: saveInvoice, isPending } = useMutation({
    mutationFn: async () => {
      const api = getAdminApi();
      const payload = {
        payerName: formData.payerName.trim(),
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        issueDate: formData.issueDate,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        note: formData.note.trim() || undefined,
        invoiceType: formData.invoiceType,
      };

      await api.post('/invoices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigation.goBack();
    },
    onError: (err) => {
      console.error('Save invoice error:', err);
    },
  });

  const handleSave = useCallback(() => {
    if (validateForm()) {
      saveInvoice();
    }
  }, [validateForm, saveInvoice]);

  const updateFormData = useCallback(<K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) => {
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
          Create Invoice
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          label="Payer Name *"
          placeholder="Enter payer name"
          value={formData.payerName}
          onChangeText={(text) => updateFormData('payerName', text)}
          errorMessage={errors.payerName}
        />

        <TextInput
          label="Amount *"
          placeholder="Enter amount"
          value={formData.amount}
          onChangeText={(text) => updateFormData('amount', text)}
          keyboardType="decimal-pad"
          errorMessage={errors.amount}
        />

        <View>
          <Text variant="body2" color="primary" style={styles.sectionLabel}>
            Payment Method
          </Text>
          <View style={styles.paymentMethodRow}>
            {(['CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER'] as const).map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentButton,
                  {
                    borderColor: formData.paymentMethod === method ? colors.primary : colors.divider,
                    backgroundColor:
                      formData.paymentMethod === method ? colors.primary : colors.white,
                  },
                ]}
                onPress={() => updateFormData('paymentMethod', method)}
              >
                <Text
                  variant="body3"
                  color={formData.paymentMethod === method ? 'white' : 'primary'}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TextInput
          label="Issue Date"
          placeholder="YYYY-MM-DD"
          value={formData.issueDate}
          onChangeText={(text) => updateFormData('issueDate', text)}
          keyboardType="default"
        />

        <TextInput
          label="Reference Number"
          placeholder="Enter reference number"
          value={formData.referenceNumber}
          onChangeText={(text) => updateFormData('referenceNumber', text)}
        />

        <TextInput
          label="Phone"
          placeholder="+880 1234567890"
          value={formData.phone}
          onChangeText={(text) => updateFormData('phone', text)}
          keyboardType="phone-pad"
        />

        <TextInput
          label="Address"
          placeholder="Enter address"
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
        />

        <View>
          <Text variant="body2" color="primary" style={styles.sectionLabel}>
            Invoice Type
          </Text>
          <View style={styles.typeSelector}>
            {(['DONATION_RECEIPT', 'SPONSOR_RECEIPT', 'MANUAL'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  formData.invoiceType === type ? styles.typeButtonActive : styles.typeButtonInactive,
                ]}
                onPress={() => updateFormData('invoiceType', type)}
              >
                <Text
                  variant="body3"
                  color={formData.invoiceType === type ? 'white' : 'primary'}
                  numberOfLines={2}
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
          text="Create Invoice"
          onPress={handleSave}
          isLoading={isPending}
          variant="primary"
        />
      </View>
    </SafeScreen>
  );
};

export default AddInvoiceScreen;
