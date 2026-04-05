import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { Appbar, Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ContactUsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key) || fallback;

  const supportPhone = '+91 9421266124';
  const supportEmail = 'support@marketyarddoor.com';

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appBar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={tr('contact_us', 'Contact Us')} titleStyle={styles.title} />
      </Appbar.Header>

      <View style={styles.content}>
        <Card mode="outlined" style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.heading}>{tr('customer_support', 'Customer Support')}</Text>
            <Text variant="bodyMedium" style={styles.desc}>
              {tr('contact_us_desc', 'Reach us for orders, delivery, payments, or account help.')}
            </Text>

            <Button
              mode="contained-tonal"
              icon="phone"
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`tel:${supportPhone.replace(/\s/g, '')}`)}
            >
              {tr('call_us', 'Call Us')}: {supportPhone}
            </Button>

            <Button
              mode="contained-tonal"
              icon="email"
              style={styles.actionBtn}
              onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
            >
              {tr('email_us', 'Email Us')}: {supportEmail}
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  appBar: { backgroundColor: '#fff', elevation: 2 },
  title: { fontWeight: '700' },
  content: { padding: 16 },
  card: { borderRadius: 12, backgroundColor: '#fff' },
  heading: { fontWeight: '700' },
  desc: { marginTop: 6, color: '#555' },
  actionBtn: { marginTop: 12, borderRadius: 8 },
});
