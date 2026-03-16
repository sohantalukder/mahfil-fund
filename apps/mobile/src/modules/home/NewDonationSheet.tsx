import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Text, TextInput, MultilineInput, Button } from '@/shared/components/atoms';
import SelectList from '@/shared/components/molecules/select-list/SelectList';
import { useTheme } from '@/theme';
import { getApi, getAdminApi } from '@/api/client';
import { useCommunity } from '@/contexts/CommunityContext';
import { bottomSheet } from '@/shared/contexts/bottom-sheet/manager';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import rs from '@/shared/utilities/responsiveSize';

const LOGO_BG = '#1A5C30';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'BANK', label: 'Bank' },
] as const;

type PaymentValue = (typeof PAYMENT_METHODS)[number]['value'];
type DonorMode = 'existing' | 'new';

type Donor = { id: string; fullName: string; phone: string };
type Event = { id: string; name: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewDonationSheet() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { activeCommunity } = useCommunity();

  // ── Donor ──────────────────────────────────────────────────────────────────
  const [donorMode, setDonorMode] = useState<DonorMode>('existing');
  const [donorId, setDonorId] = useState<string | number | undefined>();
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorPhone, setNewDonorPhone] = useState('');

  // ── Donation fields ────────────────────────────────────────────────────────
  const [eventId, setEventId] = useState<string | number | undefined>();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentValue>('CASH');
  const [donationDate, setDonationDate] = useState(todayISO());
  const [note, setNote] = useState('');

  // ── Donors list ────────────────────────────────────────────────────────────
  const { data: donors = [], isLoading: donorsLoading } = useQuery<Donor[]>({
    queryKey: ['all-donors', activeCommunity?.id],
    queryFn: async () => {
      const api = getAdminApi();
      const res = await api.get<{ donors?: Donor[] } | Donor[]>('/donors?page=1&pageSize=100');
      if (!res.success) return [];
      const d = res.data as { donors?: Donor[] } | Donor[];
      return Array.isArray(d) ? d : (d.donors ?? []);
    },
    enabled: !!activeCommunity?.id,
  });

  // ── Events list ────────────────────────────────────────────────────────────
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['events', activeCommunity?.id],
    queryFn: async () => {
      if (!activeCommunity?.id) return [];
      const api = getApi();
      const res = await api.get<{ events?: Event[] }>('/events', {
        headers: { 'X-Community-Id': activeCommunity.id },
      });
      if (!res.success) return [];
      return (res.data as { events?: Event[] }).events ?? [];
    },
    enabled: !!activeCommunity?.id,
  });

  const donorOptions = donors.map((d) => ({
    key: d.id,
    value: `${d.fullName} — ${d.phone}`,
  }));

  const eventOptions = events.map((e) => ({ key: e.id, value: e.name }));
  const selectedEventName = events.find((e) => e.id === eventId)?.name;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const api = getAdminApi();

      let resolvedDonorId: string | number | undefined = donorId;

      if (donorMode === 'new') {
        const existing = donors.find(
          (d) => d.phone.replace(/\s+/g, '') === newDonorPhone.replace(/\s+/g, '')
        );
        if (existing) {
          resolvedDonorId = existing.id;
        } else {
          const donorRes = await api.post<{ donor?: Donor } | Donor>('/donors', {
            fullName: newDonorName.trim(),
            phone: newDonorPhone.trim(),
            donorType: 'individual',
            preferredLanguage: 'en',
            tags: [],
          });
          if (!donorRes.success) throw new Error(donorRes.error.message);
          const donorData = donorRes.data as { donor?: Donor } | Donor;
          resolvedDonorId =
            (donorData as { donor?: Donor }).donor?.id ?? (donorData as Donor).id;
        }
      }

      const res = await api.post('/donations', {
        eventId,
        donorId: resolvedDonorId,
        amount: parseFloat(amount) || 0,
        paymentMethod,
        donationDate: new Date(donationDate),
        note: note || null,
      });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent'] });
      queryClient.invalidateQueries({ queryKey: ['all-donors'] });
      bottomSheet.close();
    },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        bounces={true}
        style={{ maxHeight: rs('hf') * 0.9 }}
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <View style={[styles.titleAccent, { backgroundColor: LOGO_BG }]} />
          <Text variant="heading3" weight="bold">
            New Donation
          </Text>
        </View>

        {/* Event */}
        <View style={styles.eventField}>
          <SelectList
            label="Event"
            placeholder="Select event"
            data={eventOptions}
            setSelected={setEventId}
            save="key"
            search={false}
          />
        </View>

        {/* Donor tabs */}
        <Text variant="body1" weight="semibold" style={styles.sectionLabel}>
          Donor
        </Text>
        <View style={[styles.tabRow, { borderColor: colors.gray7 }]}>
          <TouchableOpacity
            onPress={() => setDonorMode('existing')}
            style={[
              styles.tab,
              {
                backgroundColor:
                  donorMode === 'existing' ? LOGO_BG : colors.background,
                borderColor: donorMode === 'existing' ? LOGO_BG : colors.gray7,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              variant="body2"
              weight={donorMode === 'existing' ? 'semibold' : 'regular'}
              style={{ color: donorMode === 'existing' ? colors.white : colors.text }}
            >
              Existing Donor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDonorMode('new')}
            style={[
              styles.tab,
              {
                backgroundColor:
                  donorMode === 'new' ? LOGO_BG : colors.background,
                borderColor: donorMode === 'new' ? LOGO_BG : colors.gray7,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              variant="body2"
              weight={donorMode === 'new' ? 'semibold' : 'regular'}
              style={{ color: donorMode === 'new' ? colors.white : colors.text }}
            >
              New Donor
            </Text>
          </TouchableOpacity>
        </View>

        {donorMode === 'existing' ? (
          <View style={styles.donorField}>
            <SelectList
              label="Select Donor"
              placeholder={donorsLoading ? 'Loading donors…' : 'Search donor'}
              data={donorOptions}
              setSelected={setDonorId}
              save="key"
              search
            />
          </View>
        ) : (
          <>
            <View style={styles.fieldGap}>
              <TextInput
                label="Full Name"
                placeholder="e.g. Abdullah Al Mamun"
                onChangeText={(text) => setNewDonorName(text)}
              />
            </View>
            <View style={styles.fieldGap}>
              <TextInput
                label="Phone Number"
                placeholder="01XXXXXXXXX"
                keyboardType="phone-pad"
                onChangeText={(text) => setNewDonorPhone(text)}
              />
            </View>
          </>
        )}
        <View style={styles.fieldGap}/>

        {/* Amount */}
        <View style={styles.fieldGap}>
          <TextInput
            label="Amount (BDT)"
            placeholder="৳.00"
            keyboardType="decimal-pad"
            onChangeText={(text) => setAmount(text)}
          />
        </View>

        {/* Payment Method */}
        <Text variant="body1" weight="semibold" style={styles.sectionLabel}>
         Payment Method
        </Text>
        <View style={styles.paymentGrid}>
          {PAYMENT_METHODS.map(({ value, label }) => {
            const isSelected = paymentMethod === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setPaymentMethod(value)}
                activeOpacity={0.8}
                style={[
                  styles.paymentCard,
                  {
                    borderColor: isSelected ? LOGO_BG : colors.gray7,
                    backgroundColor: isSelected ? LOGO_BG : colors.background,
                  },
                ]}
              >
                <Text
                  variant="body2"
                  weight="bold"
                  style={{ color: isSelected ? colors.white : colors.text }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Donation Date */}
        <View style={styles.fieldGap}>
          <TextInput
            label="Donation Date"
            placeholder="YYYY-MM-DD"
            defaultValue={donationDate}
            onChangeText={(text) => setDonationDate(text)}
          />
        </View>

        {/* Note */}
        <View style={styles.fieldGap}>
          <MultilineInput
            label="Note (Optional)"
            placeholder="Any specific instructions or details..."
            onChangeText={(text) => setNote(text)}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <Button
          text="Save Donation"
          bgColor={LOGO_BG}
          textColor={colors.white}
          isLoading={isPending}
          onPress={() => mutate()}
        />

        {selectedEventName ? (
          <Text variant="body3" color="secondary" style={styles.footer}>
            {selectedEventName}
          </Text>
        ) : null}
      </BottomSheetScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  donorField: {
    marginBottom: 16,
    zIndex: 200,
  },
  eventField: {
    marginBottom: 16,
    zIndex: 300,
  },
  fieldGap: {
    marginBottom: 16,
  },
  footer: {
    marginTop: 12,
    textAlign: 'center',
  },
  paymentCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingVertical: 14,
    width: '47%',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 50,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 10,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  titleAccent: {
    borderRadius: 2,
    height: 22,
    marginRight: 10,
    width: 4,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 24,
  },
});
