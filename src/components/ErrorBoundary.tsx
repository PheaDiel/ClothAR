// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Button, Card, IconButton } from 'react-native-paper';
import { theme } from '../theme/theme';
import { hp, wp, rf } from '../utils/responsiveUtils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <View style={styles.errorHeader}>
                <IconButton
                  icon="alert-circle"
                  size={48}
                  iconColor={theme.colors.danger}
                />
                <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
                <Text style={styles.errorSubtitle}>
                  We encountered an unexpected error. Please try again.
                </Text>
              </View>

              {__DEV__ && this.state.error && (
                <ScrollView style={styles.errorDetails}>
                  <Text style={styles.errorText}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.errorInfo && (
                    <Text style={styles.errorStack}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </ScrollView>
              )}

              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={this.handleRetry}
                  style={styles.retryButton}
                  buttonColor={theme.colors.primary}
                >
                  Try Again
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    // In a real app, you might navigate to a support screen
                    console.log('Navigate to support');
                  }}
                  style={styles.supportButton}
                >
                  Get Help
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: wp(4),
  },
  errorCard: {
    width: '100%',
    maxWidth: wp(90),
    elevation: 4,
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  errorTitle: {
    fontSize: rf(20),
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginTop: hp(1),
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: rf(16),
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: hp(1),
  },
  errorDetails: {
    maxHeight: hp(30),
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: wp(3),
    marginVertical: hp(2),
  },
  errorText: {
    fontSize: rf(12),
    color: theme.colors.error,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: rf(10),
    color: theme.colors.onSurfaceVariant,
    fontFamily: 'monospace',
    marginTop: hp(1),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2),
  },
  retryButton: {
    flex: 1,
    marginRight: wp(2),
  },
  supportButton: {
    flex: 1,
    marginLeft: wp(2),
  },
});