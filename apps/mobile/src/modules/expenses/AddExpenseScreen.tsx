import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import TextInput from '@/shared/components/atoms/text-input/TextInput';
import MultilineInput from '@/shared/components/atoms/text-input/MultilineInput';
import { useTheme } from '@/theme';
import { getApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { ArrowBackIcon, SaveIcon } from '@/shared/components/atoms/svg-icons/AppSvgIcons';
import { getStyles } from './styles';

const CATEGORIES = [
  { key: 'FOOD', labelKey: 'expenses.category_food' },
  { key: 'DRINKS', labelKey: 'expenses.category_drinks' },
  { key: 'DATES', labelKey: 'expenses.category_dates' },
  { key: 'WATER', labelKey: 'expenses.category_water' },
  { key: 'DECORATION', labelKey: 'expenses.category_decoration' },
  { key: 'MOSQUE_SUPPORT', labelKey: 'expenses.category_mosque_support' },
  { key: 'MISC', labelKey: 'expenses.category_misc' },
] as const;

export default function AddExpenseScreen() {
  const { t } = useTranslation();
  const { colors, gutters, borders } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const navigation = useNavigation();
  const { activeCommunity } = useCommunity();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('FOOD');
  const [note, setNote] = useState('');
  const [titleError, setTitleError] = useState('');
  const [amountError, setAmountError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const api = getApi();
      return api.post('/expenses', {
        title: title.trim(),
        amount: parseFloat(amount) || 0,
        category,
        expenseDate: new Date().toISOString().slice(0, 10),
        note: note.trim() || null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-summary'] });
      navigation.goBack();
    },
  });

  function validate(): boolean {
    let valid = true;
    if (!title.trim()) {
      setTitleError(t('expenses.validation_title_required'));
      valid = false;
    } else {
      setTitleError('');
    }
    if (!amount || parseFloat(amount) <= 0) {
      setAmountError(t('expenses.validation_amount_required'));
      valid = false;
    } else {
      setAmountError('');
    }
    return valid;
  }

  function handleSave() {
    if (!activeCommunity?.id) return;
    if (!validate()) return;
    mutate();
  }

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowBackIcon color={colors.text} size={20} />
            </TouchableOpacity>
            <Text variant="body2" weight="semibold">
              {t('expenses.add_title')}
            </Text>
          </View>

          {/* Heading */}
          <View style={styles.headingSection}>
            <Text variant="heading1" weight="bold" style={styles.headingTitle}>
              {t('expenses.add_title')}
            </Text>
            <Text variant="body2" color="secondary">
              {t('expenses.add_subtitle')}
            </Text>
          </View>

          {/* Expense Title */}
          <TextInput
            label={t('expenses.field_title')}
            placeholder={t('expenses.field_title_placeholder')}
            onChangeText={(text) => setTitle(text)}
            defaultValue={title}
            errorMessage={titleError}
            wrapperStyle={gutters.marginBottom_16}
          />

          {/* Amount */}
          <TextInput
            label={t('expenses.field_amount')}
            placeholder={t('expenses.field_amount_placeholder')}
            keyboardType="decimal-pad"
            onChangeText={(text) => setAmount(text)}
            defaultValue={amount}
            errorMessage={amountError}
            wrapperStyle={gutters.marginBottom_16}
            rightIcon={
              <View style={styles.amountAddon}>
                <Text variant="body1" weight="semibold" color="secondary">
                  {t('common.currency_symbol')}
                </Text>
              </View>
            }
          />

          {/* Category */}
          <Text variant="body1" weight="semibold" style={styles.fieldLabel}>
            {t('expenses.field_category')}
          </Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body2"
                    weight={isSelected ? 'semibold' : 'regular'}
                    style={
                      isSelected
                        ? styles.chipTextSelected
                        : styles.chipTextUnselected
                    }
                  >
                    {t(cat.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notes */}
          <MultilineInput
            label={t('expenses.field_notes')}
            placeholder={t('expenses.field_notes_placeholder')}
            onChangeText={(text) => setNote(text)}
            defaultValue={note}
            containerStyle={[gutters.marginTop_8, borders.rounded_8]}
          />

          {/* Save Button */}
          <Button
            text={t('expenses.save_button')}
            icon={<SaveIcon color={colors.white} size={18} />}
            iconPosition="left"
            bgColor="#1A5C30"
            wrapStyle={styles.saveBtn}
            onPress={handleSave}
            isLoading={isPending}
            disabled={isPending}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
