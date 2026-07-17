import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

type PlantProfile = {
  id: string;
  plant_type: string;
  common_name: string;
  scientific_name: string;
  target_soil: number;
  nutrient_interval_days: number;
  watering_volume_ml: number | null;
  watering_duration_seconds: number | null;
  watering_flow_rate_ml_per_sec: number | null;
  water_available: boolean | null;
  description: string | null;
};

export default function ProfileScreen() {
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('plant_profiles')
      .select('*')
      .order('common_name');

    if (error) {
      console.log(error.message);
      setProfiles([]);
    } else {
      setProfiles(data ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loading}>
          Mengambil profil tanaman...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Text style={styles.title}>Profil Tanaman</Text>

      <Text style={styles.subtitle}>
        Informasi dasar tanaman yang digunakan sebagai acuan sistem
        HydroPlant.
      </Text>

      {profiles.map((plant) => (
        <View key={plant.id} style={styles.profileCard}>

          <Text style={styles.plantName}>
            {plant.common_name}
          </Text>

          <Text style={styles.scientificName}>
            {plant.scientific_name}
          </Text>

          <View style={styles.dataRow}>
            <Text style={styles.label}>Jenis</Text>
            <Text style={styles.value}>
              {plant.plant_type}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>
              Target Soil Moisture
            </Text>
            <Text style={styles.value}>
              {plant.target_soil}%
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>
              Interval Nutrisi
            </Text>
            <Text style={styles.value}>
              {plant.nutrient_interval_days} hari
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>Volume Air</Text>
            <Text style={styles.value}>
              {plant.watering_volume_ml != null
                ? `${plant.watering_volume_ml.toFixed(2)} mL`
                : '-'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>Durasi Eksekusi</Text>
            <Text style={styles.value}>
              {plant.watering_duration_seconds != null
                ? `${plant.watering_duration_seconds} detik`
                : '-'}
            </Text>
          </View>

          <View style={styles.dataRow}>
            <Text style={styles.label}>Status Air</Text>
            <Text style={styles.value}>
              {plant.water_available == null
                ? '-'
                : plant.water_available
                  ? 'Tersedia'
                  : 'Habis'}
            </Text>
          </View>
          <View style={styles.dataRow}>
            <Text style={styles.label}>Debit Pompa</Text>
            <Text style={styles.value}>
              {plant.watering_flow_rate_ml_per_sec != null
                ? `${plant.watering_flow_rate_ml_per_sec} mL/detik`
                : '-'}
            </Text>
          </View>

          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionTitle}>
              Rekomendasi Perawatan
            </Text>

            <Text style={styles.description}>
              {plant.description ??
                'Belum ada deskripsi.'}
            </Text>
          </View>
        </View>
      ))}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7F2',
  },

  loading: {
    marginTop: 10,
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

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },

  plantName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F3D2B',
  },

  scientificName: {
    fontSize: 14,
    color: '#6B7A6A',
    fontStyle: 'italic',
    marginBottom: 15,
  },

  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },

  label: {
    flex: 1,
    color: '#6B7A6A',
    fontSize: 14,
  },

  value: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
    color: '#1F3D2B',
    fontSize: 14,
  },

  descriptionBox: {
    marginTop: 18,
    backgroundColor: '#F4F7F2',
    padding: 15,
    borderRadius: 14,
  },

  descriptionTitle: {
    fontWeight: '700',
    color: '#1F3D2B',
    marginBottom: 8,
  },

  description: {
    color: '#40513B',
    lineHeight: 22,
    fontSize: 14,
  },
});