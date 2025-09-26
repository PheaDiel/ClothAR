import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Card, Text } from 'react-native-paper';
import { theme } from '../theme/theme';

interface BusinessLocation {
  latitude: number;
  longitude: number;
  address: string;
  name: string;
}

interface BusinessMapProps {
  location: BusinessLocation | null;
}

const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d242.61597465441082!2d123.73175740972958!3d13.359253894021206!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a1adb85051777f%3A0xe77887b574c41804!2sBEGINO'S%20TAILORING!5e0!3m2!1sen!2sph!4v1758440620791!5m2!1sen!2sph"
    width="600"
    height="450"
    style="border:0;"
    allowfullscreen=""
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade">
  </iframe>
</body>
</html>
`;

export default function BusinessMap({ location }: BusinessMapProps) {
  console.log('DEBUG: BusinessMap rendered with location:', location ? location.name : 'null');
  if (!location) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Pickup Location</Text>
          <Text>Location not available</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{location.name}</Text>
        <Text>{location.address}</Text>
        <View style={styles.mapContainer}>
          <WebView
            source={{ html: mapHtml }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, backgroundColor: theme.colors.surface },
  mapContainer: {
    height: 200,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden'
  },
  webview: {
    flex: 1
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderRadius: 8
  },
  placeholderText: { color: theme.colors.onSurface }
});