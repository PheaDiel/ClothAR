import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import OptimizedImage from './OptimizedImage';

const { height: screenHeight } = Dimensions.get('window');

interface LazyImageProps {
  source: { uri: string } | number;
  style?: ViewStyle;
  placeholder?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  onError?: () => void;
  priority?: 'low' | 'normal' | 'high';
  quality?: number;
  enableCache?: boolean;
  threshold?: number; // Distance from viewport to start loading (in pixels)
}

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  placeholder,
  resizeMode = 'cover',
  onLoad,
  onError,
  priority = 'normal',
  quality = 80,
  enableCache = true,
  threshold = 100,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const viewRef = useRef<View>(null);

  useEffect(() => {
    if (priority === 'high') {
      // High priority images load immediately
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    const checkVisibility = () => {
      if (viewRef.current) {
        viewRef.current.measure((x, y, width, height, pageX, pageY) => {
          const isInViewport =
            pageY < screenHeight + threshold &&
            pageY + height > -threshold;

          if (isInViewport && !hasBeenVisible) {
            setIsVisible(true);
            setHasBeenVisible(true);
          }
        });
      }
    };

    // Check visibility immediately
    checkVisibility();

    // Also check on scroll (simplified - in real app you'd use ScrollView onScroll)
    const interval = setInterval(checkVisibility, 100);

    return () => clearInterval(interval);
  }, [threshold, priority, hasBeenVisible]);

  return (
    <View ref={viewRef} style={[styles.container, style]}>
      {isVisible ? (
        <OptimizedImage
          source={source}
          style={styles.image}
          placeholder={placeholder}
          resizeMode={resizeMode}
          onLoad={onLoad}
          onError={onError}
          priority={priority}
          quality={quality}
          enableCache={enableCache}
        />
      ) : (
        <View style={[styles.placeholder, style]}>
          {placeholder && (
            <OptimizedImage
              source={{ uri: placeholder }}
              style={styles.placeholderImage}
              resizeMode="cover"
              priority="low"
              quality={50}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
});

export default React.memo(LazyImage);