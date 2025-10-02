import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking
} from 'react-native';
import { Card, Searchbar, List, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type HelpScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const FAQ_CATEGORIES = [
  {
    id: 'ar_tryon',
    title: 'AR Try-On',
    icon: 'eye-outline',
    color: '#2E86AB',
    faqs: [
      {
        question: 'How does AR try-on work?',
        answer: 'Point your camera at yourself and our AI will overlay clothing items on your body in real-time. Make sure you have good lighting and stand against a plain background for best results.'
      },
      {
        question: 'Why isn\'t the AR try-on working?',
        answer: 'Ensure your device has a working camera and you\'ve granted camera permissions. AR works best in well-lit environments. If issues persist, try restarting the app or updating your device.'
      },
      {
        question: 'Can I try on multiple items at once?',
        answer: 'Currently, you can try on one item at a time. We\'re working on multi-item try-on functionality for future updates.'
      }
    ]
  },
  {
    id: 'measurements',
    title: 'Measurements',
    icon: 'resize-outline',
    color: '#AB47BC',
    faqs: [
      {
        question: 'Why do I need to provide measurements?',
        answer: 'Measurements ensure your custom-tailored clothing fits perfectly. We use these measurements to create garments that match your body shape and size preferences.'
      },
      {
        question: 'How accurate do my measurements need to be?',
        answer: 'Measurements should be as accurate as possible. Use the measurement guide for detailed instructions. Even small differences can affect the final fit.'
      },
      {
        question: 'Can I update my measurements later?',
        answer: 'Yes, you can update your measurements anytime from your profile. New measurements will be saved and can be used for future orders.'
      },
      {
        question: 'What if I don\'t know how to measure myself?',
        answer: 'Use our built-in measurement guide with step-by-step instructions and illustrations. For best results, ask someone to help you measure.'
      }
    ]
  },
  {
    id: 'orders',
    title: 'Pre-orders & Payment',
    icon: 'cart-outline',
    color: '#66BB6A',
    faqs: [
      {
        question: 'How do I place a pre-order?',
        answer: 'Browse items, select your size, add to pre-order cart, and proceed to checkout. You can choose standard sizes or request custom tailoring with your measurements.'
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept credit/debit cards, digital wallets, and cash on delivery. All payments are processed securely through our payment partners.'
      },
      {
        question: 'Can I modify my pre-order after placing it?',
        answer: 'Pre-orders can be modified within 1 hour of placement. Contact our support team immediately if you need changes. Once production starts, modifications may not be possible.'
      },
      {
        question: 'How long does pre-order processing take?',
        answer: 'Standard pre-orders take 3-5 business days. Custom-tailored pre-orders take 7-14 business days depending on complexity. You\'ll receive tracking updates throughout the process. All pre-orders are for pickup only.'
      }
    ]
  },
  {
    id: 'tailoring',
    title: 'Custom Tailoring',
    icon: 'cut-outline',
    color: '#FFA726',
    faqs: [
      {
        question: 'What is custom tailoring?',
        answer: 'Custom tailoring creates garments specifically for your body measurements and style preferences. This ensures a perfect fit unlike standard sizes.'
      },
      {
        question: 'How much does custom tailoring cost?',
        answer: 'Tailoring costs vary by item complexity. Basic alterations start at ₱200, while full custom pieces range from ₱500-₱2000 depending on the garment.'
      },
      {
        question: 'Can I see samples before ordering?',
        answer: 'We provide detailed descriptions and customer photos. For high-value custom orders, we can arrange virtual consultations or fabric samples.'
      },
      {
        question: 'What if I\'m not satisfied with the tailoring?',
        answer: 'We offer a 7-day satisfaction guarantee. If the fit isn\'t perfect, we\'ll make adjustments at no extra cost or provide a full refund.'
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: 'person-outline',
    color: '#EF5350',
    faqs: [
      {
        question: 'Do I need an account to shop?',
        answer: 'You can browse and try on items as a guest, but creating an account allows you to save measurements, track orders, and enjoy a personalized experience.'
      },
      {
        question: 'How do I reset my password?',
        answer: 'Go to login screen and tap "Forgot Password". Enter your email and follow the reset instructions sent to your inbox.'
      },
      {
        question: 'Can I have multiple measurement profiles?',
        answer: 'Yes! You can save multiple measurement sets for different occasions (e.g., "Work Wear", "Casual", "Formal"). Set one as your default.'
      },
      {
        question: 'How do I delete my account?',
        answer: 'Contact our support team with your account details. We\'ll process your deletion request within 30 days as per our privacy policy.'
      }
    ]
  }
];

export default function HelpScreen({ navigation }: HelpScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredCategories = FAQ_CATEGORIES.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.faqs.some(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const renderFAQItem = (faq: typeof FAQ_CATEGORIES[0]['faqs'][0], index: number, categoryId: string) => {
    const faqId = `${categoryId}-${index}`;
    const isExpanded = expandedFAQ === faqId;

    return (
      <Card key={faqId} style={styles.faqCard}>
        <TouchableOpacity onPress={() => toggleFAQ(faqId)}>
          <Card.Content style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </Card.Content>
        </TouchableOpacity>

        {isExpanded && (
          <Card.Content style={styles.faqAnswer}>
            <Text style={styles.faqAnswerText}>{faq.answer}</Text>
          </Card.Content>
        )}
      </Card>
    );
  };

  const renderCategory = (category: typeof FAQ_CATEGORIES[0]) => (
    <View key={category.id} style={styles.categoryContainer}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => setSelectedCategory(
          selectedCategory === category.id ? null : category.id
        )}
      >
        <View style={styles.categoryTitleContainer}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
            <Ionicons name={category.icon as any} size={20} color="#fff" />
          </View>
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </View>
        <Ionicons
          name={selectedCategory === category.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {selectedCategory === category.id && (
        <View style={styles.faqList}>
          {category.faqs.map((faq, index) =>
            renderFAQItem(faq, index, category.id)
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search FAQs..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Help</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MeasurementGuide')}
            >
              <Ionicons name="book-outline" size={24} color="#2E86AB" />
              <Text style={styles.actionButtonText}>Measurement Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL('tel:+1234567890')}
            >
              <Ionicons name="call-outline" size={24} color="#66BB6A" />
              <Text style={styles.actionButtonText}>Call Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL('mailto:support@clothar.com')}
            >
              <Ionicons name="mail-outline" size={24} color="#AB47BC" />
              <Text style={styles.actionButtonText}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.categoriesTitle}>Frequently Asked Questions</Text>
          {filteredCategories.map(renderCategory)}
        </View>

        {/* Contact Information */}
        <Card style={styles.contactCard}>
          <Card.Content>
            <Text style={styles.contactTitle}>Still need help?</Text>
            <Text style={styles.contactText}>
              Our support team is here to help you with any questions or concerns.
            </Text>

            <View style={styles.contactMethods}>
              <TouchableOpacity
                style={styles.contactMethod}
                onPress={() => Linking.openURL('tel:+1234567890')}
              >
                <Ionicons name="call" size={20} color="#2E86AB" />
                <Text style={styles.contactMethodText}>+1 (234) 567-8900</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactMethod}
                onPress={() => Linking.openURL('mailto:support@clothar.com')}
              >
                <Ionicons name="mail" size={20} color="#2E86AB" />
                <Text style={styles.contactMethodText}>support@clothar.com</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactMethod}
                onPress={() => Linking.openURL('https://wa.me/1234567890')}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#2E86AB" />
                <Text style={styles.contactMethodText}>WhatsApp Support</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.responseTime}>
              We typically respond within 2-4 hours during business days.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    backgroundColor: '#fff',
  },
  quickActions: {
    padding: 16,
    paddingTop: 0,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  categoriesContainer: {
    padding: 16,
    paddingTop: 0,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  faqList: {
    marginTop: 8,
  },
  faqCard: {
    marginBottom: 8,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactCard: {
    margin: 16,
    marginTop: 0,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactMethods: {
    gap: 12,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactMethodText: {
    fontSize: 14,
    color: '#2E86AB',
    marginLeft: 12,
    fontWeight: '500',
  },
  responseTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
