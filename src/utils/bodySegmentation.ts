import { NativePose, NativePoseLandmark } from './nativePoseDetection';

// Body segmentation for better overlay boundaries
export interface BodySegment {
  id: string;
  name: string;
  landmarks: (keyof NativePose['landmarks'])[];
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  confidence: number;
  area: number;
}

export interface SegmentationMask {
  width: number;
  height: number;
  data: Uint8Array; // 0 = background, 1-255 = different body parts
  segments: BodySegment[];
}

export class BodySegmentationEngine {
  private segmentationCache = new Map<string, SegmentationMask>();

  // Segment body into logical parts for better overlay positioning
  segmentBody(pose: NativePose, frameWidth: number = 400, frameHeight: number = 600): SegmentationMask {
    const cacheKey = `${pose.timestamp}-${frameWidth}-${frameHeight}`;

    if (this.segmentationCache.has(cacheKey)) {
      return this.segmentationCache.get(cacheKey)!;
    }

    const segments = this.identifyBodySegments(pose);
    const mask = this.createSegmentationMask(segments, frameWidth, frameHeight);

    // Cache result for performance
    this.segmentationCache.set(cacheKey, mask);

    // Limit cache size
    if (this.segmentationCache.size > 10) {
      const firstKey = this.segmentationCache.keys().next().value;
      if (firstKey) {
        this.segmentationCache.delete(firstKey);
      }
    }

    return mask;
  }

  // Identify major body segments from pose landmarks
  private identifyBodySegments(pose: NativePose): BodySegment[] {
    const segments: BodySegment[] = [];
    const landmarks = pose.landmarks;

    // Head segment
    const headSegment = this.createHeadSegment(landmarks);
    if (headSegment) segments.push(headSegment);

    // Torso segment
    const torsoSegment = this.createTorsoSegment(landmarks);
    if (torsoSegment) segments.push(torsoSegment);

    // Left arm segment
    const leftArmSegment = this.createArmSegment(landmarks, 'left');
    if (leftArmSegment) segments.push(leftArmSegment);

    // Right arm segment
    const rightArmSegment = this.createArmSegment(landmarks, 'right');
    if (rightArmSegment) segments.push(rightArmSegment);

    // Left leg segment
    const leftLegSegment = this.createLegSegment(landmarks, 'left');
    if (leftLegSegment) segments.push(leftLegSegment);

    // Right leg segment
    const rightLegSegment = this.createLegSegment(landmarks, 'right');
    if (rightLegSegment) segments.push(rightLegSegment);

    return segments;
  }

  private createHeadSegment(landmarks: NativePose['landmarks']): BodySegment | null {
    const nose = landmarks.nose;
    const leftEar = landmarks.leftEar;
    const rightEar = landmarks.rightEar;

    if (nose.confidence < 0.5) return null;

    const earDistance = Math.abs(rightEar.x - leftEar.x);
    const headWidth = earDistance * 1.2;
    const headHeight = headWidth * 1.1;

    const centerX = (leftEar.x + rightEar.x) / 2;
    const centerY = nose.y - headHeight * 0.3;

    return {
      id: 'head',
      name: 'Head',
      landmarks: ['nose', 'leftEar', 'rightEar', 'leftEye', 'rightEye'],
      bounds: {
        left: centerX - headWidth / 2,
        top: centerY - headHeight / 2,
        right: centerX + headWidth / 2,
        bottom: centerY + headHeight / 2
      },
      confidence: (nose.confidence + leftEar.confidence + rightEar.confidence) / 3,
      area: headWidth * headHeight
    };
  }

  private createTorsoSegment(landmarks: NativePose['landmarks']): BodySegment | null {
    const leftShoulder = landmarks.leftShoulder;
    const rightShoulder = landmarks.rightShoulder;
    const leftHip = landmarks.leftHip;
    const rightHip = landmarks.rightHip;

    if (leftShoulder.confidence < 0.5 || rightShoulder.confidence < 0.5) return null;

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const torsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);

    const left = Math.min(leftShoulder.x, leftHip.x) - shoulderWidth * 0.1;
    const right = Math.max(rightShoulder.x, rightHip.x) + shoulderWidth * 0.1;
    const top = Math.min(leftShoulder.y, rightShoulder.y) - torsoHeight * 0.1;
    const bottom = Math.max(leftHip.y, rightHip.y) + torsoHeight * 0.1;

    return {
      id: 'torso',
      name: 'Torso',
      landmarks: ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'],
      bounds: { left, top, right, bottom },
      confidence: (leftShoulder.confidence + rightShoulder.confidence + leftHip.confidence + rightHip.confidence) / 4,
      area: (right - left) * (bottom - top)
    };
  }

  private createArmSegment(landmarks: NativePose['landmarks'], side: 'left' | 'right'): BodySegment | null {
    const shoulder = landmarks[`${side}Shoulder` as keyof typeof landmarks];
    const elbow = landmarks[`${side}Elbow` as keyof typeof landmarks];
    const wrist = landmarks[`${side}Wrist` as keyof typeof landmarks];

    if (shoulder.confidence < 0.5 || elbow.confidence < 0.5) return null;

    const armWidth = Math.abs(shoulder.x - wrist.x) * 0.3;
    const armLength = Math.abs(wrist.y - shoulder.y);

    // Create bounding box that encompasses the arm
    const points = [shoulder, elbow, wrist].filter(p => p.confidence > 0.3);
    if (points.length < 2) return null;

    const left = Math.min(...points.map(p => p.x)) - armWidth / 2;
    const right = Math.max(...points.map(p => p.x)) + armWidth / 2;
    const top = Math.min(...points.map(p => p.y)) - armWidth / 2;
    const bottom = Math.max(...points.map(p => p.y)) + armWidth / 2;

    return {
      id: `${side}Arm`,
      name: `${side === 'left' ? 'Left' : 'Right'} Arm`,
      landmarks: [`${side}Shoulder`, `${side}Elbow`, `${side}Wrist`],
      bounds: { left, top, right, bottom },
      confidence: (shoulder.confidence + elbow.confidence + wrist.confidence) / 3,
      area: (right - left) * (bottom - top)
    };
  }

  private createLegSegment(landmarks: NativePose['landmarks'], side: 'left' | 'right'): BodySegment | null {
    const hip = landmarks[`${side}Hip` as keyof typeof landmarks];
    const knee = landmarks[`${side}Knee` as keyof typeof landmarks];
    const ankle = landmarks[`${side}Ankle` as keyof typeof landmarks];

    if (hip.confidence < 0.5 || knee.confidence < 0.5) return null;

    const legWidth = Math.abs(hip.x - ankle.x) * 0.4;
    const legLength = Math.abs(ankle.y - hip.y);

    const points = [hip, knee, ankle].filter(p => p.confidence > 0.3);
    if (points.length < 2) return null;

    const left = Math.min(...points.map(p => p.x)) - legWidth / 2;
    const right = Math.max(...points.map(p => p.x)) + legWidth / 2;
    const top = Math.min(...points.map(p => p.y)) - legWidth / 2;
    const bottom = Math.max(...points.map(p => p.y)) + legWidth / 2;

    return {
      id: `${side}Leg`,
      name: `${side === 'left' ? 'Left' : 'Right'} Leg`,
      landmarks: [`${side}Hip`, `${side}Knee`, `${side}Ankle`],
      bounds: { left, top, right, bottom },
      confidence: (hip.confidence + knee.confidence + ankle.confidence) / 3,
      area: (right - left) * (bottom - top)
    };
  }

  // Create segmentation mask from identified segments
  private createSegmentationMask(segments: BodySegment[], width: number, height: number): SegmentationMask {
    const data = new Uint8Array(width * height);

    segments.forEach((segment, index) => {
      const segmentId = index + 1; // 1-255 for different segments

      // Fill segment area in mask
      for (let y = Math.max(0, Math.floor(segment.bounds.top));
           y < Math.min(height, Math.ceil(segment.bounds.bottom));
           y++) {
        for (let x = Math.max(0, Math.floor(segment.bounds.left));
             x < Math.min(width, Math.ceil(segment.bounds.right));
             x++) {
          const pixelIndex = y * width + x;
          data[pixelIndex] = segmentId;
        }
      }
    });

    return {
      width,
      height,
      data,
      segments
    };
  }

  // Get overlay constraints based on body segmentation
  getOverlayConstraints(segmentation: SegmentationMask, clothingCategory: string): {
    safeZones: BodySegment[];
    avoidZones: BodySegment[];
    preferredAnchors: Array<{ x: number; y: number; weight: number }>;
  } {
    const safeZones: BodySegment[] = [];
    const avoidZones: BodySegment[] = [];
    const preferredAnchors: Array<{ x: number; y: number; weight: number }> = [];

    switch (clothingCategory) {
      case 'tops':
      case 'outerwear':
        // Safe zones: torso, arms (for sleeves)
        safeZones.push(...segmentation.segments.filter(s => ['torso', 'leftArm', 'rightArm'].includes(s.id)));
        // Avoid: head, legs
        avoidZones.push(...segmentation.segments.filter(s => ['head', 'leftLeg', 'rightLeg'].includes(s.id)));
        // Preferred anchors: shoulders and hips
        segmentation.segments
          .filter(s => s.id === 'torso')
          .forEach(segment => {
            preferredAnchors.push(
              { x: segment.bounds.left + (segment.bounds.right - segment.bounds.left) * 0.5, y: segment.bounds.top, weight: 1.0 }, // Top center
              { x: segment.bounds.left, y: segment.bounds.top + (segment.bounds.bottom - segment.bounds.top) * 0.5, weight: 0.8 }, // Left center
              { x: segment.bounds.right, y: segment.bounds.top + (segment.bounds.bottom - segment.bounds.top) * 0.5, weight: 0.8 } // Right center
            );
          });
        break;

      case 'bottoms':
        // Safe zones: legs, lower torso
        safeZones.push(...segmentation.segments.filter(s => ['leftLeg', 'rightLeg'].includes(s.id)));
        // Avoid: head, arms, upper torso
        avoidZones.push(...segmentation.segments.filter(s => ['head', 'leftArm', 'rightArm'].includes(s.id)));
        // Preferred anchors: hips
        segmentation.segments
          .filter(s => s.id === 'torso')
          .forEach(segment => {
            preferredAnchors.push(
              { x: segment.bounds.left + (segment.bounds.right - segment.bounds.left) * 0.5, y: segment.bounds.bottom, weight: 1.0 } // Bottom center
            );
          });
        break;

      case 'dresses':
        // Safe zones: entire body except head
        safeZones.push(...segmentation.segments.filter(s => s.id !== 'head'));
        // Avoid: head
        avoidZones.push(...segmentation.segments.filter(s => s.id === 'head'));
        // Preferred anchors: shoulders and hips
        segmentation.segments
          .filter(s => s.id === 'torso')
          .forEach(segment => {
            preferredAnchors.push(
              { x: segment.bounds.left + (segment.bounds.right - segment.bounds.left) * 0.5, y: segment.bounds.top, weight: 1.0 }, // Top center
              { x: segment.bounds.left + (segment.bounds.right - segment.bounds.left) * 0.5, y: segment.bounds.bottom, weight: 0.9 } // Bottom center
            );
          });
        break;
    }

    return { safeZones, avoidZones, preferredAnchors };
  }

  // Check if overlay position conflicts with body segments
  checkOverlayConflicts(
    overlayBounds: { left: number; top: number; right: number; bottom: number },
    segmentation: SegmentationMask,
    clothingCategory: string
  ): {
    conflicts: BodySegment[];
    overlapPercentage: number;
    recommendedAdjustment?: { x: number; y: number };
  } {
    const constraints = this.getOverlayConstraints(segmentation, clothingCategory);
    const conflicts: BodySegment[] = [];
    let totalOverlap = 0;

    // Check overlap with avoid zones
    constraints.avoidZones.forEach(segment => {
      const overlap = this.calculateOverlap(overlayBounds, segment.bounds);
      if (overlap > 0) {
        conflicts.push(segment);
        totalOverlap += overlap;
      }
    });

    const overlayArea = (overlayBounds.right - overlayBounds.left) * (overlayBounds.bottom - overlayBounds.top);
    const overlapPercentage = overlayArea > 0 ? totalOverlap / overlayArea : 0;

    // Calculate recommended adjustment if conflicts exist
    let recommendedAdjustment;
    if (conflicts.length > 0 && constraints.preferredAnchors.length > 0) {
      // Find closest preferred anchor
      const overlayCenter = {
        x: (overlayBounds.left + overlayBounds.right) / 2,
        y: (overlayBounds.top + overlayBounds.bottom) / 2
      };

      let closestAnchor = constraints.preferredAnchors[0];
      let minDistance = Infinity;

      constraints.preferredAnchors.forEach(anchor => {
        const distance = Math.sqrt(
          Math.pow(anchor.x - overlayCenter.x, 2) + Math.pow(anchor.y - overlayCenter.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestAnchor = anchor;
        }
      });

      recommendedAdjustment = {
        x: closestAnchor.x - overlayCenter.x,
        y: closestAnchor.y - overlayCenter.y
      };
    }

    return {
      conflicts,
      overlapPercentage,
      recommendedAdjustment
    };
  }

  // Calculate overlap area between two rectangles
  private calculateOverlap(rect1: { left: number; top: number; right: number; bottom: number },
                          rect2: { left: number; top: number; right: number; bottom: number }): number {
    const overlapLeft = Math.max(rect1.left, rect2.left);
    const overlapTop = Math.max(rect1.top, rect2.top);
    const overlapRight = Math.min(rect1.right, rect2.right);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);

    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
    const overlapHeight = Math.max(0, overlapBottom - overlapTop);

    return overlapWidth * overlapHeight;
  }

  // Clear segmentation cache
  clearCache() {
    this.segmentationCache.clear();
  }
}

// Export singleton instance
export const bodySegmentationEngine = new BodySegmentationEngine();