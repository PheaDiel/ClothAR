# Virtual Try-On Fix Plan

## Current Issues Identified

### 1. Endless Shuttering During Real-Time Pose Detection
**Root Cause:** The frame processing loop is too aggressive with minimal debouncing and no proper error handling, causing continuous camera restarts.

**Current Problems:**
- Frame processing interval is too short (200ms minimum)
- No proper error recovery when pose detection fails
- Camera `takePictureAsync` is called too frequently with high quality settings
- No adaptive frame rate management for low-end devices

### 2. Clothing Model Not Showing Up
**Root Cause:** The clothing overlay rendering depends on successful pose detection, but when pose detection fails, no overlay is rendered.

**Current Problems:**
- No fallback overlay positioning when pose detection fails
- Clothing selection doesn't trigger overlay without pose data
- Single layer mode requires pose data to render overlays

### 3. 2D Overlay Positioning Issues
**Root Cause:** The overlay positioning logic is complex and depends entirely on ML pose detection results.

**Current Problems:**
- No fallback positioning when ML fails
- Overlay calculations are too complex and error-prone
- No visual feedback when positioning fails

## Detailed Fix Plan

### Phase 1: Fix Endless Shuttering (Priority: High)

1. **Optimize Frame Processing Loop**
   - Increase minimum frame interval to 300-500ms
   - Add proper error handling with exponential backoff
   - Implement adaptive frame rate based on device capabilities
   - Add frame processing timeout and recovery

2. **Improve Camera Settings**
   - Reduce photo quality for pose detection (0.05 → 0.02)
   - Use `skipProcessing: true` consistently
   - Add camera stability checks before processing

3. **Add Error Recovery**
   - Implement frame processing failure counter
   - Add automatic restart with increased intervals on failures
   - Clear pose data on extended failures to prevent stale overlays

### Phase 2: Fix Clothing Model Display (Priority: High)

1. **Add Fallback Overlay Positioning**
   - Implement center-screen positioning when pose detection fails
   - Add user-guided positioning with touch controls
   - Create default body proportions for overlay scaling

2. **Improve Overlay Rendering Logic**
   - Separate overlay rendering from pose detection success
   - Add overlay visibility states independent of pose data
   - Implement progressive overlay loading (placeholder → positioned)

3. **Enhance Clothing Selection**
   - Allow clothing selection without requiring pose detection
   - Add preview overlays with default positioning
   - Implement overlay persistence across pose detection failures

### Phase 3: Implement Proper 2D Overlay Positioning (Priority: Medium)

1. **Create Robust Positioning System**
   - Implement anchor-based positioning with fallback coordinates
   - Add body proportion estimation from screen dimensions
   - Create positioning confidence scoring

2. **Add Visual Positioning Aids**
   - Implement drag-and-drop overlay positioning
   - Add resize handles for manual adjustment
   - Create positioning guides and snap-to-body features

3. **Improve Measurement Integration**
   - Better fallback when user measurements aren't available
   - Add proportional scaling based on detected body size
   - Implement clothing-specific positioning rules

### Phase 4: Performance Optimizations (Priority: Medium)

1. **Frame Processing Optimization**
   - Implement frame skipping for performance
   - Add processing queue with prioritization
   - Optimize tensor operations and memory usage

2. **Rendering Optimizations**
   - Implement overlay caching and reuse
   - Add progressive loading for complex overlays
   - Optimize image processing and scaling

### Phase 5: Testing and Validation (Priority: High)

1. **End-to-End Testing**
   - Test on various device types and performance levels
   - Validate fallback behaviors
   - Test error recovery scenarios

2. **User Experience Validation**
   - Ensure smooth transitions between states
   - Validate overlay positioning accuracy
   - Test clothing selection and switching

## Implementation Strategy

### Code Changes Required:

1. **CameraScreen.tsx**
   - Modify `startFrameProcessing()` to be less aggressive
   - Add error recovery and adaptive intervals
   - Implement fallback overlay positioning
   - Separate overlay rendering from pose detection

2. **arUtils.ts**
   - Add fallback pose detection methods
   - Implement center-screen positioning logic
   - Add overlay rendering without pose data
   - Improve error handling in pose detection

3. **nativePoseDetection.ts**
   - Add more robust fallback pose generation
   - Implement pose recovery mechanisms
   - Add performance monitoring and adaptation

### Testing Approach:

1. Unit tests for individual components
2. Integration tests for pose detection pipeline
3. Performance tests on various devices
4. User acceptance testing for overlay positioning

## Success Criteria

- No endless shuttering during pose detection
- Clothing overlays appear reliably, even with pose detection failures
- Smooth user experience with proper fallbacks
- Overlay positioning works on various body types and poses
- Performance acceptable on low-end devices
- Clear error states and recovery mechanisms

## Risk Mitigation

- Implement feature flags for new functionality
- Add comprehensive logging for debugging
- Create rollback plan for each phase
- Test extensively on target devices before deployment