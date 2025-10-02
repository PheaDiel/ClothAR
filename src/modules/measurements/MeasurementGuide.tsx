import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type MeasurementGuideProps = {
  navigation: NativeStackNavigationProp<any>;
};

const MEASUREMENT_STEPS = [
  {
    id: 'bust',
    title: 'Bust Measurement',
    description: 'Measure around the fullest part of your bust, keeping the tape parallel to the floor.',
    tips: 'Wear a well-fitting bra. Keep arms down and breathe normally.',
    image: 'https://via.placeholder.com/300x200.png?text=Bust+Measurement'
  },
  {
    id: 'waist',
    title: 'Waist Measurement',
    description: 'Find your natural waistline (usually the smallest part of your torso) and measure around it.',
    tips: 'Don\'t suck in your stomach. Keep the tape snug but not tight.',
    image: 'https://via.placeholder.com/300x200.png?text=Waist+Measurement'
  },
  {
    id: 'hip',
    title: 'Hip Measurement',
    description: 'Measure around the widest part of your hips, about 8 inches below your waist.',
    tips: 'Stand with feet together. Keep the tape parallel to the floor.',
    image: 'https://via.placeholder.com/300x200.png?text=Hip+Measurement'
  },
  {
    id: 'inseam',
    title: 'Inseam Measurement',
    description: 'Measure from the crotch seam to the bottom of the leg along the inside seam.',
    tips: 'Wear the shoes you plan to wear with the pants. Keep legs straight.',
    image: 'https://via.placeholder.com/300x200.png?text=Inseam+Measurement'
  },
  {
    id: 'shoulder',
    title: 'Shoulder Measurement',
    description: 'Measure from the edge of one shoulder to the edge of the other shoulder.',
    tips: 'Measure across your back from shoulder seam to shoulder seam.',
    image: 'https://via.placeholder.com/300x200.png?text=Shoulder+Measurement'
  },
  {
    id: 'sleeve',
    title: 'Sleeve Measurement',
    description: 'Measure from the center of the back of your neck to your wrist.',
    tips: 'Bend your arm slightly. Follow the natural curve of your arm.',
    image: 'https://via.placeholder.com/300x200.png?text=Sleeve+Measurement'
  }
];

export default function MeasurementGuide({ navigation }: MeasurementGuideProps) {
  const renderStep = (step: typeof MEASUREMENT_STEPS[0], index: number) => (
    <Card key={step.id} style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
        </View>

        <Image
          source={{ uri: step.image }}
          style={styles.stepImage}
          resizeMode="cover"
        />

        <Text style={styles.stepDescription}>{step.description}</Text>

        <View style={styles.tipsContainer}>
          <Ionicons name="bulb-outline" size={16} color="#2E86AB" />
          <Text style={styles.tipsTitle}>Tip: </Text>
          <Text style={styles.tipsText}>{step.tips}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Introduction */}
          <View style={styles.intro}>
            <Ionicons name="information-circle-outline" size={24} color="#2E86AB" />
            <Text style={styles.introTitle}>How to Take Accurate Measurements</Text>
            <Text style={styles.introText}>
              Follow these steps to ensure your clothing fits perfectly. Use a flexible measuring tape
              and have someone help you if possible. All measurements should be in inches.
            </Text>
          </View>

          {/* Tools Needed */}
          <Card style={styles.toolsCard}>
            <Card.Content>
              <Text style={styles.toolsTitle}>What You'll Need:</Text>
              <View style={styles.toolsList}>
                <View style={styles.toolItem}>
                  <Ionicons name="ellipse" size={8} color="#2E86AB" />
                  <Text style={styles.toolText}>Flexible measuring tape</Text>
                </View>
                <View style={styles.toolItem}>
                  <Ionicons name="ellipse" size={8} color="#2E86AB" />
                  <Text style={styles.toolText}>Mirror (optional)</Text>
                </View>
                <View style={styles.toolItem}>
                  <Ionicons name="ellipse" size={8} color="#2E86AB" />
                  <Text style={styles.toolText}>Pen and paper to record measurements</Text>
                </View>
                <View style={styles.toolItem}>
                  <Ionicons name="ellipse" size={8} color="#2E86AB" />
                  <Text style={styles.toolText}>Well-fitting clothes or undergarments</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* General Tips */}
          <Card style={styles.tipsCard}>
            <Card.Content>
              <Text style={styles.tipsCardTitle}>General Tips:</Text>
              <View style={styles.generalTipsList}>
                <Text style={styles.generalTip}>• Stand straight with good posture</Text>
                <Text style={styles.generalTip}>• Keep the tape snug but not tight</Text>
                <Text style={styles.generalTip}>• Measure both sides and use the larger measurement</Text>
                <Text style={styles.generalTip}>• Take measurements 2-3 times for accuracy</Text>
                <Text style={styles.generalTip}>• Wear the shoes you'll wear with the garment</Text>
              </View>
            </Card.Content>
          </Card>

          {/* Measurement Steps */}
          <Text style={styles.stepsTitle}>Step-by-Step Guide</Text>
          {MEASUREMENT_STEPS.map((step, index) => renderStep(step, index))}

          {/* Additional Notes */}
          <Card style={styles.notesCard}>
            <Card.Content>
              <Text style={styles.notesTitle}>Additional Notes:</Text>
              <Text style={styles.notesText}>
                • Body measurements can vary throughout the day due to factors like eating, exercise, and temperature.{'\n'}
                • For the most accurate results, take measurements at the same time of day.{'\n'}
                • If you're between sizes, we recommend choosing the larger size for comfort.{'\n'}
                • Keep your measurements updated as your body changes over time.
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Back to Profile
        </Button>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('BodyMeasurementForm')}
          style={styles.startButton}
        >
          Start Measuring
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  intro: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  toolsCard: {
    marginBottom: 16,
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  toolsList: {
    gap: 8,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolText: {
    fontSize: 14,
    color: '#666',
  },
  tipsCard: {
    marginBottom: 16,
  },
  tipsCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  generalTipsList: {
    gap: 4,
  },
  generalTip: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stepsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stepCard: {
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E86AB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  stepImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F4F8',
    padding: 12,
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E86AB',
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  notesCard: {
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  startButton: {
    flex: 1,
  },
});
