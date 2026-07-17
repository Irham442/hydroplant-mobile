// app/plant-detail.tsx

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const availableSensors = [1];

type PlantProfile = {
  id: string;
  plant_type: string;
  common_name: string;
  scientific_name: string;
  target_soil: number;
  nutrient_interval_days: number;
  nutrient_volume_ml: number;
  description: string | null;
};

type UserPlant = {
  id: string;
  profile_id: string;
  plant_name: string;
  sensor_number: number;
  is_active: boolean;
  location: string | null;
  notes: string | null;
  plant_profiles?: PlantProfile;
};

type MonitoringLog = {
  id: number;
  user_plant_id: string;
  plant_type: string;
  soil: number;
  temperature: number;
  humidity: number;
  target_soil: number;
  needs_watering: boolean;
  watering_volume_ml: number;
  watering_duration_seconds: number;
  watering_flow_rate_ml_per_sec: number;
  water_available: boolean;  
  emotion: string;
  emoji: string;
  status: string;
  reading_phase: string;
  predicted_final_soil: number | null;
  cost: number | null;
  created_at: string;
};

export default function PlantDetailScreen() {
  const params = useLocalSearchParams();
  const userPlantId = String(params.id);

  const [plant, setPlant] = useState<UserPlant | null>(null);
  const [latestLog, setLatestLog] = useState<MonitoringLog | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const [plantName, setPlantName] = useState('');
  const [location, setLocation] = useState('');
  const [sensorNumber, setSensorNumber] = useState<number>(1);

  const fetchPlantDetail = async () => {
    const { data: plantData, error: plantError } = await supabase
      .from('user_plants')
      .select(`
        *,
        plant_profiles (
          id,
          plant_type,
          common_name,
          scientific_name,
          target_soil,
          nutrient_interval_days,
          nutrient_volume_ml,
          description
        )
      `)
      .eq('id', userPlantId)
      .single();

    if (plantError) {
      console.log('Gagal mengambil user_plants:', plantError.message);
      setPlant(null);
    } else {
      setPlant(plantData);
      setPlantName(plantData.plant_name);
      setLocation(plantData.location ?? '');
      setSensorNumber(plantData.sensor_number);
    }

    const { data: logData, error: logError } = await supabase
      .from('monitoring_logs')
      .select('*')
      .eq('user_plant_id', userPlantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) {
      console.log('Gagal mengambil monitoring_logs:', logError.message);
      setLatestLog(null);
    } else {
      setLatestLog(logData);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPlantDetail();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlantDetail();
  };

  // const handleManualWatering = () => {
  //   Alert.alert(
  //     'Penyiraman Manual',
  //     `Siram ${plant?.plant_name ?? 'tanaman'} sekarang?`,
  //     [
  //       { text: 'Batal', style: 'cancel' },
  //       {
  //         text: 'Siram',
  //         onPress: () => {
  //           Alert.alert(
  //             'Belum tersedia',
  //             'Fitur penyiraman manual belum dihubungkan ke FastAPI.'
  //           );
  //         },
  //       },
  //     ]
  //   );
  // };

  const handleSaveEdit = async () => {
    if (!plantName.trim()) {
      Alert.alert('Nama kosong', 'Nama tanaman tidak boleh kosong.');
      return;
    }

    const { error } = await supabase
      .from('user_plants')
      .update({
        plant_name: plantName.trim(),
        location: location.trim() || null,
        sensor_number: sensorNumber,
      })
      .eq('id', userPlantId);

    if (error) {
      Alert.alert('Gagal memperbarui tanaman', error.message);
      return;
    }

    setEditVisible(false);
    fetchPlantDetail();
    Alert.alert('Berhasil', 'Data tanaman monitoring diperbarui.');
  };

  const handleStopMonitoring = () => {
    setMenuVisible(false);

    Alert.alert(
      'Berhenti Monitoring',
      `Berhenti memonitor ${plant?.plant_name ?? 'tanaman'}? Riwayat monitoring tetap tersimpan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Berhenti',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('user_plants')
              .update({ is_active: false })
              .eq('id', userPlantId);

            if (error) {
              Alert.alert('Gagal menghentikan monitoring', error.message);
              return;
            }

            router.back();
          },
        },
      ]
    );
  };
  const handleStartMonitoring = () => {
    setMenuVisible(false);

    Alert.alert(
      'Monitoring Tanaman',
      `Sensor aktif akan dipindahkan ke ${plant?.plant_name}. Lanjutkan?`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Pindahkan',
          onPress: async () => {

            // nonaktifkan tanaman yang sedang dipantau
            await supabase
              .from('user_plants')
              .update({ is_active: false })
              .eq('sensor_number', 1);

            // aktifkan tanaman ini
            const { error } = await supabase
              .from('user_plants')
              .update({
                is_active: true,
                sensor_number: 1,
              })
              .eq('id', userPlantId);

            if (error) {
              Alert.alert(
                'Gagal',
                error.message
              );
              return;
            }

            fetchPlantDetail();

            Alert.alert(
              'Berhasil',
              'Monitoring berhasil dipindahkan.'
            );
          },
        },
      ]
    );
  };

  const handleDeletePlant = () => {
  setMenuVisible(false);

    Alert.alert(
      'Hapus Tanaman',
      `Tanaman ${plant?.plant_name ?? ''} akan dihapus dari daftar monitoring aktif. Riwayat monitoring tetap tersimpan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('user_plants')
              .update({ is_active: false })
              .eq('id', userPlantId);

            if (error) {
              Alert.alert('Gagal menghapus tanaman', error.message);
              return;
            }

            Alert.alert('Berhasil', 'Tanaman dihapus dari daftar monitoring aktif.');
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Mengambil detail tanaman...</Text>
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Tanaman tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Text style={styles.menuText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.emoji}>{latestLog?.emoji ?? '-'}</Text>
        <Text style={styles.title}>{plant.plant_name}</Text>
        <Text style={styles.subtitle}>
          {plant.plant_profiles?.common_name ?? '-'} •{' '}
          {plant.plant_profiles?.scientific_name ?? '-'}
        </Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {latestLog?.status ?? 'Belum ada data monitoring'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Monitoring</Text>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Sensor</Text>
          <Text style={styles.value}>Sensor {plant.sensor_number}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Soil Moisture</Text>
          <Text style={styles.value}>
            {latestLog ? `${latestLog.soil}%` : '-'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Suhu</Text>
          <Text style={styles.value}>
            {latestLog ? `${latestLog.temperature}°C` : '-'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Kelembapan Udara</Text>
          <Text style={styles.value}>
            {latestLog ? `${latestLog.humidity}%` : '-'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Target Soil</Text>
          <Text style={styles.value}>
            {plant.plant_profiles?.target_soil ?? '-'}%
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Emosi</Text>
          <Text style={styles.value}>{latestLog?.emotion ?? '-'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Phase</Text>
          <Text style={styles.value}>{latestLog?.reading_phase ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Keputusan Sistem</Text>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Butuh Penyiraman</Text>
          <Text style={styles.value}>
            {latestLog ? (latestLog.needs_watering ? 'Ya' : 'Tidak') : '-'}
          </Text>
        </View>

        <View style={styles.dataRow}>
            <Text style={styles.label}>
                Volume Air
            </Text>

            <Text style={styles.value}>
                {latestLog?.watering_volume_ml != null
                    ? `${latestLog.watering_volume_ml.toFixed(2)} mL`
                    : '-'}
            </Text>
        </View>

        <View style={styles.dataRow}>
            <Text style={styles.label}>
                Durasi Eksekusi
            </Text>

            <Text style={styles.value}>
                {latestLog?.watering_duration_seconds != null
                    ? `${latestLog.watering_duration_seconds} detik`
                    : '-'}
            </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Prediksi Soil</Text>
          <Text style={styles.value}>
            {latestLog?.predicted_final_soil ?? '-'}%
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Cost SA</Text>
          <Text style={styles.value}>{latestLog?.cost ?? '-'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Update Terakhir</Text>
          <Text style={styles.value}>
            {latestLog
              ? new Date(latestLog.created_at).toLocaleString('id-ID')
              : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profil Tanaman</Text>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Lokasi</Text>
          <Text style={styles.value}>{plant.location ?? '-'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Nutrisi</Text>
          <Text style={styles.value}>
            Setiap {plant.plant_profiles?.nutrient_interval_days ?? '-'} hari
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.label}>Volume Nutrisi</Text>
          <Text style={styles.value}>
            {plant.plant_profiles?.nutrient_volume_ml  ?? '-'} detik
          </Text>
        </View>

        <Text style={styles.description}>
          {plant.plant_profiles?.description ?? 'Tidak ada deskripsi tanaman.'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Air</Text>

        <View style={styles.dataRow}>
            <Text style={styles.label}>
                Status Air
            </Text>

            <Text style={styles.value}>
                {latestLog
                    ? latestLog.water_available
                        ? 'Tersedia'
                        : 'Habis'
                    : '-'}
            </Text>
        </View>
        <View style={styles.dataRow}>
            <Text style={styles.label}>
                Debit Pompa
            </Text>

            <Text style={styles.value}>
                {latestLog?.watering_flow_rate_ml_per_sec != null
                    ? `${latestLog.watering_flow_rate_ml_per_sec} mL/detik`
                    : '-'}
            </Text>
        </View>
      </View>

      {/* <TouchableOpacity style={styles.waterButton} onPress={handleManualWatering}>
        <Text style={styles.waterButtonText}>Siram Manual</Text>
      </TouchableOpacity> */}

      <Modal transparent visible={menuVisible} animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setEditVisible(true);
              }}
            >
              <Text style={styles.menuItemText}>
                Edit tanaman
              </Text>
            </TouchableOpacity>

            {!plant.is_active ? (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleStartMonitoring}
              >
                <Text style={styles.menuItemText}>
                  Monitoring tanaman ini
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleStopMonitoring}
              >
                <Text style={styles.deleteText}>
                  Berhenti monitoring
                </Text>
              </TouchableOpacity>
            )}
              {/* <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDeletePlant}
              >
                <Text style={styles.deleteText}>
                  Hapus tanaman
                </Text>
              </TouchableOpacity> */}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal transparent visible={editVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Tanaman</Text>

            <Text style={styles.inputLabel}>Nama tanaman</Text>
            <TextInput
              style={styles.input}
              value={plantName}
              onChangeText={setPlantName}
            />

            <Text style={styles.inputLabel}>Lokasi</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Ruang tamu"
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.inputLabel}>Sensor</Text>
            <View style={styles.optionGroup}>
              {availableSensors.map((sensor) => (
                <TouchableOpacity
                  key={sensor}
                  style={[
                    styles.optionButton,
                    sensorNumber === sensor && styles.optionButtonActive,
                  ]}
                  onPress={() => setSensorNumber(sensor)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sensorNumber === sensor && styles.optionTextActive,
                    ]}
                  >
                    Sensor {sensor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.note}>
              Jenis tanaman dan target soil tidak diubah karena menjadi parameter dasar sistem.
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F2' },
  content: { padding: 20, paddingBottom: 100 },
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
  header: {
    marginTop: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: { fontSize: 16, fontWeight: '700', color: '#2F6B3F' },
  menuText: { fontSize: 30, fontWeight: '700', color: '#1F3D2B' },
  heroCard: {
    backgroundColor: '#DDEEDB',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 18,
  },
  emoji: { fontSize: 44, fontWeight: '700', marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F3D2B',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7A6A',
    marginTop: 4,
    textAlign: 'center',
  },
  statusBadge: {
    marginTop: 14,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2F6B3F',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 12,
  },
  label: { fontSize: 14, color: '#6B7A6A' },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F3D2B',
    textAlign: 'right',
    flexShrink: 1,
  },
  description: {
    fontSize: 14,
    color: '#40513B',
    marginTop: 14,
    lineHeight: 20,
  },
  waterButton: {
    backgroundColor: '#2F6B3F',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  waterButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 20,
  },
  menuCard: {
    width: 190,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
  },
  menuItem: { paddingVertical: 13, paddingHorizontal: 16 },
  menuItemText: { fontSize: 15, fontWeight: '700', color: '#1F3D2B' },
  deleteText: { fontSize: 15, fontWeight: '700', color: '#B42318' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#40513B',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F4F7F2',
    borderRadius: 14,
    padding: 12,
    color: '#1F3D2B',
  },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F4F7F2',
  },
  optionButtonActive: { backgroundColor: '#2F6B3F' },
  optionText: { color: '#40513B', fontWeight: '600' },
  optionTextActive: { color: '#FFFFFF' },
  note: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7A6A',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#EEF2EC',
  },
  cancelButtonText: { color: '#40513B', fontWeight: '700' },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#2F6B3F',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700' },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 12,
    textAlign: 'center',
  },
});