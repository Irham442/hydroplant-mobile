import { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type UserPlant = {
  id: string;
  plant_name: string;
};

type MonitoringLog = {
  id: number;
  user_plant_id: string | null;
  plant_type: string;
  soil: number;
  temperature: number;
  humidity: number;
  target_soil: number;
  needs_watering: boolean;
  watering_volume_ml: number | null;
  watering_duration_seconds: number | null;
  watering_flow_rate_ml_per_sec: number | null;
  water_available: boolean | null;
  emotion: string;
  emoji: string;
  status: string;
  reading_phase: string;
  predicted_final_soil: number | null;
  cost: number | null;
  created_at: string;
  user_plants?: UserPlant | null;
};

export default function HistoryScreen() {
  const [logs, setLogs] = useState<MonitoringLog[]>([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formattedDate = date.toISOString().split('T')[0];

  const fetchHistory = async () => {
    const startDate = `${formattedDate}T00:00:00`;
    const endDate = `${formattedDate}T23:59:59`;

    const { data, error } = await supabase
      .from('monitoring_logs')
      .select(`
        *,
        user_plants (
          id,
          plant_name
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Gagal mengambil riwayat:', error.message);
      setLogs([]);
    } else {
      setLogs(data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [formattedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const onChange = (_: any, selected?: Date) => {
    setShowPicker(false);

    if (selected) {
      setDate(selected);
    }
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString('id-ID');
  };

  const formatPhase = (phase: string) => {
    if (phase === 'normal_monitoring') return 'Normal Monitoring';
    if (phase === 'after_watering') return 'After Watering';
    return phase;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Mengambil riwayat monitoring...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Riwayat</Text>
      <Text style={styles.subtitle}>
        Riwayat pembacaan sensor dan keputusan sistem
      </Text>

      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.datePickerLabel}>Tanggal dipilih</Text>
        <Text style={styles.datePickerText}>{formattedDate}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChange}
        />
      )}

      {logs.length > 0 ? (
        logs.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.plantName}>
                  {item.user_plants?.plant_name ?? item.plant_type}
                </Text>
                <Text style={styles.timeText}>
                  {formatDateTime(item.created_at)}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {formatPhase(item.reading_phase)}
                </Text>
              </View>
            </View>

            <View style={styles.emotionBox}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={styles.emotionTextWrap}>
                <Text style={styles.emotionText}>{item.emotion}</Text>
                <Text style={styles.statusDescription}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Soil Moisture</Text>
              <Text style={styles.value}>{item.soil}%</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Target Soil</Text>
              <Text style={styles.value}>{item.target_soil}%</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Suhu</Text>
              <Text style={styles.value}>{item.temperature}°C</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Kelembapan Udara</Text>
              <Text style={styles.value}>{item.humidity}%</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Butuh Penyiraman</Text>
              <Text style={styles.value}>
                {item.needs_watering ? 'Ya' : 'Tidak'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Volume Air</Text>
              <Text style={styles.value}>
                {item.watering_volume_ml != null
                  ? `${item.watering_volume_ml.toFixed(2)} mL`
                  : '-'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Durasi Eksekusi</Text>
              <Text style={styles.value}>
                {item.watering_duration_seconds != null
                  ? `${item.watering_duration_seconds} detik`
                  : '-'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Status Air</Text>
              <Text style={styles.value}>
                {item.water_available == null
                  ? '-'
                  : item.water_available
                    ? 'Tersedia'
                    : 'Habis'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Prediksi Soil</Text>
              <Text style={styles.value}>
                {item.predicted_final_soil ?? '-'}%
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Cost SA</Text>
              <Text style={styles.value}>{item.cost ?? '-'}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>Debit Pompa</Text>
              <Text style={styles.value}>
                {item.watering_flow_rate_ml_per_sec != null
                  ? `${item.watering_flow_rate_ml_per_sec} mL/detik`
                  : '-'}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Tidak ada riwayat</Text>
          <Text style={styles.emptyText}>
            Tidak ditemukan data monitoring pada tanggal tersebut.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F2',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    backgroundColor: '#F4F7F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#40513B',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1F3D2B',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7A6A',
    marginBottom: 20,
  },
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 13,
    color: '#6B7A6A',
    marginBottom: 6,
  },
  datePickerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3D2B',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  plantName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F3D2B',
  },
  timeText: {
    fontSize: 13,
    color: '#7A8678',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#E8F6EA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F6B3F',
  },
  emotionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7F2',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 12,
    color: '#1F3D2B',
  },
  emotionTextWrap: {
    flex: 1,
  },
  emotionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F3D2B',
    textTransform: 'capitalize',
  },
  statusDescription: {
    fontSize: 13,
    color: '#6B7A6A',
    marginTop: 2,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#6B7A6A',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F3D2B',
    textAlign: 'right',
    flexShrink: 1,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7A6A',
    textAlign: 'center',
  },
});