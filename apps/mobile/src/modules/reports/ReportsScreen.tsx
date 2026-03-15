import { useState } from 'react';
import { View, ScrollView, Share, Platform } from 'react-native';
import { SafeScreen } from '@/shared/components/templates';
import Text from '@/shared/components/atoms/text/Text';
import Button from '@/shared/components/atoms/buttons/Button';
import { useTheme } from '@/theme';
import { useCommunity } from '@/contexts/CommunityContext';
import { getApiBaseUrl } from '@/config/env';
import { supabase } from '@/lib/supabase';
import RNFS from 'react-native-fs';

const REPORT_TYPES = [
  { value: 'donation_summary', label: 'Donation summary' },
  { value: 'expense_summary', label: 'Expense summary' },
  { value: 'donor_totals', label: 'Donor totals' },
  { value: 'balance_summary', label: 'Balance summary' },
  { value: 'payment_method_summary', label: 'Payment methods' },
] as const;

const FORMATS = ['pdf', 'xlsx', 'csv'] as const;

export default function ReportsScreen() {
  const { gutters } = useTheme();
  const { activeCommunity } = useCommunity();
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0].value);
  const [format, setFormat] = useState<string>('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    if (!activeCommunity?.id) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const params = new URLSearchParams({ reportType, format });
      const url = `${getApiBaseUrl()}/reports/export?${params}`;
      const res = await fetch(url, {
        headers: {
          'X-Community-Id': activeCommunity.id,
          Authorization: `Bearer ${token}`,
          'X-Client': 'mahfil',
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const b64 =
        typeof global.btoa !== 'undefined'
          ? global.btoa(binary)
          : Buffer.from(bytes).toString('base64');
      const path = `${RNFS.CachesDirectoryPath}/report-${reportType}.${format}`;
      await RNFS.writeFile(path, b64, 'base64');
      await Share.share(
        Platform.OS === 'ios'
          ? { url: `file://${path}` }
          : { message: `Report saved`, url: `file://${path}` },
      );
    } catch {
      setError('Failed to export. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!activeCommunity) {
    return (
      <SafeScreen>
        <View style={gutters.padding_24}>
          <Text color="secondary">Select a community to export reports.</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={[gutters.padding_20]}>
        <Text variant="heading3" style={gutters.marginBottom_8}>
          Reports
        </Text>
        <Text color="secondary" style={gutters.marginBottom_20}>
          {activeCommunity.name}
        </Text>
        <Text style={gutters.marginBottom_8}>Type</Text>
        {REPORT_TYPES.map((r) => (
          <Button
            key={r.value}
            text={r.label}
            variant={reportType === r.value ? 'primary' : 'outline'}
            wrapStyle={gutters.marginBottom_8}
            onPress={() => setReportType(r.value)}
          />
        ))}
        <Text style={[gutters.marginTop_16, gutters.marginBottom_8]}>Format</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FORMATS.map((f) => (
            <Button
              key={f}
              text={f.toUpperCase()}
              variant={format === f ? 'primary' : 'outline'}
              onPress={() => setFormat(f)}
            />
          ))}
        </View>
        {error ? (
          <Text color="error" style={gutters.marginTop_12}>
            {error}
          </Text>
        ) : null}
        <Button
          text={loading ? 'Exporting…' : 'Download & share'}
          onPress={() => void download()}
          isLoading={loading}
          disabled={loading}
          wrapStyle={gutters.marginTop_24}
        />
      </ScrollView>
    </SafeScreen>
  );
}
