import { router } from 'expo-router';
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
import { supabase } from '../../lib/supabase';

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
  created_at: string;
};

type UserPlant = {
  id: string;
  profile_id: string;
  plant_name: string;
  sensor_number: number;
  is_active: boolean;
  location: string | null;
  notes: string | null;
  created_at: string;
  plant_profiles?: PlantProfile;
};

type LatestLog = {
  id: number;
  created_at: string;
};

export default function DashboardScreen() {
  const [plantProfiles, setPlantProfiles] = useState<PlantProfile[]>([]);
  const [userPlants, setUserPlants] = useState<UserPlant[]>([]);
  const [latestLog, setLatestLog] = useState<LatestLog | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [plantName, setPlantName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PlantProfile | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<number | null>(null);

  const usedSensors = userPlants
    .filter((plant) => plant.is_active)
    .map((plant) => plant.sensor_number);
  const unusedSensors = availableSensors.filter(
    (sensor) => !usedSensors.includes(sensor)
  );

  const fetchDashboardData = async () => {
    const { data: profileData, error: profileError } = await supabase
      .from('plant_profiles')
      .select('*')
      .order('common_name', { ascending: true });

    if (profileError) {
      console.log('Gagal mengambil plant_profiles:', profileError.message);
    } else {
      setPlantProfiles(profileData ?? []);
      if (!selectedProfile && profileData && profileData.length > 0) {
        setSelectedProfile(profileData[0]);
      }
    }

    const { data: userPlantData, error: userPlantError } = await supabase
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
          description,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userPlantError) {
      console.log('Gagal mengambil user_plants:', userPlantError.message);
    } else {
      setUserPlants(userPlantData ?? []);
    }

    const { data: logData, error: logError } = await supabase
      .from('monitoring_logs')
      .select('id, created_at')
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
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getConnectionStatus = () => {
    if (!latestLog) return 'Belum terhubung';

    const lastUpdate = new Date(latestLog.created_at).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - lastUpdate) / 60000;

    return diffMinutes <= 35 ? 'Online' : 'Offline';
  };

  const addPlant = async () => {
    if (!plantName.trim()) {
      Alert.alert('Nama tanaman kosong', 'Masukkan nama tanaman terlebih dahulu.');
      return;
    }

    if (!selectedProfile) {
      Alert.alert('Jenis tanaman belum dipilih', 'Pilih jenis tanaman terlebih dahulu.');
      return;
    }

    const sensorToUse = 1;

    const { error: deactivateError } = await supabase
      .from('user_plants')
      .update({ is_active: false })
      .eq('sensor_number', sensorToUse);

    if (deactivateError) {
      Alert.alert('Gagal memindahkan sensor', deactivateError.message);
      return;
    }

  const { error } = await supabase.from('user_plants').insert({
    profile_id: selectedProfile.id,
    plant_name: plantName.trim(),
    sensor_number: sensorToUse,
    is_active: true,
    location: location.trim() || null,
    notes: null,
  });

    if (error) {
      Alert.alert('Gagal menyimpan tanaman', error.message);
      return;
    }

    setPlantName('');
    setLocation('');
    setSelectedSensor(null);
    setModalVisible(false);
    fetchDashboardData();
  };

  const openDetail = (plant: UserPlant) => {
    router.push({
      pathname: '/plant-detail',
      params: {
        id: plant.id,
        profileId: plant.profile_id,
        plantName: plant.plant_name,
        sensorNumber: String(plant.sensor_number),
        plantType: plant.plant_profiles?.plant_type ?? '',
        commonName: plant.plant_profiles?.common_name ?? '',
        scientificName: plant.plant_profiles?.scientific_name ?? '',
        targetSoil: String(plant.plant_profiles?.target_soil ?? ''),
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Mengambil data HydroPlant...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>HydroPlant</Text>
      <Text style={styles.subtitle}>Monitoring & Otomatisasi Hidrasi Tanaman</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Status Perangkat</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Koneksi Sistem</Text>
          <Text style={styles.summaryValue}>{getConnectionStatus()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tanaman Dipantau</Text>
          <Text style={styles.summaryValue}>{userPlants.length}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Update Terakhir</Text>
          <Text style={styles.summaryValue}>
            {latestLog
              ? new Date(latestLog.created_at).toLocaleString('id-ID')
              : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tanaman Monitoring</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setSelectedProfile(plantProfiles[0] ?? null);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {userPlants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Belum ada tanaman dipantau</Text>
          <Text style={styles.emptyText}>
            Tambahkan tanaman dan hubungkan dengan sensor yang tersedia.
          </Text>
        </View>
      ) : (
        userPlants.map((plant) => (
          <TouchableOpacity
            key={plant.id}
            activeOpacity={0.85}
            style={styles.plantCard}
            onPress={() => openDetail(plant)}
          >
            <Text style={styles.plantName}>{plant.plant_name}</Text>

            <Text style={styles.plantType}>
              {plant.plant_profiles?.common_name ?? '-'} •{' '}
              {plant.plant_profiles?.scientific_name ?? '-'}
            </Text>

            <View
              style={[
                styles.statusBadge,
                !plant.is_active && styles.inactiveBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  !plant.is_active && styles.inactiveBadgeText,
                ]}
              >
                {plant.is_active
                  ? `Dipantau Sensor ${plant.sensor_number}`
                  : 'Monitoring dihentikan'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Target Soil</Text>
              <Text style={styles.value}>
                {plant.plant_profiles?.target_soil ?? '-'}%
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.label}>Lokasi</Text>
              <Text style={styles.value}>{plant.location ?? '-'}</Text>
            </View>

            <Text style={styles.description}>
              Ketuk untuk melihat detail monitoring tanaman.
            </Text>
          </TouchableOpacity>
        ))
      )}

      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Tanaman</Text>

            <Text style={styles.inputLabel}>Nama tanaman</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Anggrek Meja"
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

            <Text style={styles.inputLabel}>Jenis tanaman</Text>
            <View style={styles.optionGroup}>
              {plantProfiles.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.optionButton,
                    selectedProfile?.id === profile.id && styles.optionButtonActive,
                  ]}
                  onPress={() => setSelectedProfile(profile)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedProfile?.id === profile.id && styles.optionTextActive,
                    ]}
                  >
                    {profile.common_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Sensor</Text>
            <View style={styles.optionGroup}>
              {unusedSensors.map((sensor) => (
                <TouchableOpacity
                  key={sensor}
                  style={[
                    styles.optionButton,
                    selectedSensor === sensor && styles.optionButtonActive,
                  ]}
                  onPress={() => setSelectedSensor(sensor)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedSensor === sensor && styles.optionTextActive,
                    ]}
                  >
                    Sensor {sensor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={addPlant}>
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
  },
  loadingText: { marginTop: 12, color: '#40513B' },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1F3D2B',
    marginTop: 20,
  },
  subtitle: { fontSize: 15, color: '#6B7A6A', marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#DDEEDB',
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  summaryLabel: { fontSize: 14, color: '#40513B' },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F3D2B',
    textAlign: 'right',
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F3D2B' },
  addButton: {
    backgroundColor: '#2F6B3F',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  disabledButton: { opacity: 0.4 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 8,
  },
  inactiveBadge: {
  backgroundColor: '#F3EBDD',
  },

  inactiveBadgeText: {
    color: '#8A5A00',
  },
  emptyText: { fontSize: 14, color: '#6B7A6A', textAlign: 'center' },
  plantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8FBC8F',
  },
  plantName: { fontSize: 20, fontWeight: '700', color: '#1F3D2B' },
  plantType: { fontSize: 13, color: '#7A8678', marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E8F6EA',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F6B3F',
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
  description: { fontSize: 14, color: '#40513B', marginTop: 14 },
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
});