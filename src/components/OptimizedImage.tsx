import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';
import { wp } from '../utils/responsiveUtils';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ViewStyle;
  placeholder?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  priority?: 'low' | 'normal' | 'high';
  quality?: number; // 1-100, affects compression
  enableCache?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  placeholder = 'https://via.placeholder.com/300x400.png?text=Loading...',
  resizeMode = 'cover',
  onLoad,
  onError,
  priority = 'normal',
  quality = 80,
  enableCache = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSource, setImageSource] = useState(source);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef<Image>(null);
  const maxRetries = 2;

  // Handle URI source with optimization
  useEffect(() => {
    if (typeof source === 'object' && source.uri) {
      console.log('OptimizedImage: Processing source URI:', source.uri);
      // Add quality parameter for compression if it's a remote image
      if (source.uri.startsWith('http') && quality < 100) {
        const separator = source.uri.includes('?') ? '&' : '?';
        const optimizedUri = `${source.uri}${separator}quality=${quality}`;
        console.log('OptimizedImage: Optimized URI:', optimizedUri);
        setImageSource({ uri: optimizedUri });
      } else {
        setImageSource(source);
      }
    } else {
      setImageSource(source);
    }
    // Reset retry count when source changes
    setRetryCount(0);
  }, [source, quality]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    console.log('OptimizedImage: Error loading image:', source, 'Retry count:', retryCount);

    // Try retrying first
    if (retryCount < maxRetries) {
      console.log('OptimizedImage: Retrying image load, attempt:', retryCount + 1);
      setRetryCount(prev => prev + 1);
      setError(false);
      setLoading(true);
      // Force re-render by updating source slightly
      setTimeout(() => {
        if (typeof source === 'object' && source.uri) {
          setImageSource({ ...source });
        }
      }, 1000); // Wait 1 second before retry
      return;
    }

    // All retries failed, fallback to placeholder
    setLoading(false);
    setError(true);
    console.log('OptimizedImage: All retries failed, falling back to placeholder');

    if (placeholder && typeof source === 'object' && source.uri !== placeholder) {
      console.log('OptimizedImage: Using placeholder:', placeholder);
      setImageSource({ uri: placeholder });
      setError(false);
      setLoading(true);
    }
    onError?.();
  };

  const containerStyle = [
    styles.container,
    style,
  ];

  const imageStyle = [
    styles.image,
    loading && styles.imageLoading,
  ];

  return (
    <View style={containerStyle}>
      <Image
        ref={imageRef}
        source={imageSource}
        style={imageStyle}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        accessible={true}
        accessibilityLabel="Product image"
      />

      {loading && !error && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loadingIndicator}
          />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Image
            source={{ uri: placeholder }}
            style={styles.errorImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    opacity: 0.3,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
  },
  loadingIndicator: {
    transform: [{ scale: 0.8 }],
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorImage: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
});

export default React.memo(OptimizedImage);