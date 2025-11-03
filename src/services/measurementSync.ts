// src/services/measurementSync.ts
import { Measurement } from '../types';
import { offlineStorage, PendingOperation } from './offlineStorage';
import { MeasurementService } from './measurementService';
import { useToast } from '../context/ToastContext';

export class MeasurementSyncService {
  // Save measurement with offline support
  static async saveMeasurement(measurement: Measurement): Promise<boolean> {
    try {
      // Try to save to server first
      const result = await MeasurementService.createMeasurement(measurement);

      if (result.success) {
        // Save to offline storage as backup
        await offlineStorage.saveMeasurementsOffline([measurement]);
        return true;
      } else {
        throw new Error(result.error || 'Failed to save measurement');
      }
    } catch (error) {
      console.error('Failed to save measurement online:', error);

      // Save to offline storage for later sync
      await offlineStorage.saveMeasurementsOffline([measurement]);

      // Add to pending operations
      await offlineStorage.addPendingOperation({
        type: 'measurement_save',
        data: measurement
      });

      return true; // Return true since it's saved offline
    }
  }

  // Load measurements with offline fallback
  static async loadMeasurements(): Promise<Measurement[]> {
    try {
      // Try to load from server first
      const result = await MeasurementService.getUserMeasurements();

      if (result.success && result.measurements) {
        // Save to offline storage as backup
        await offlineStorage.saveMeasurementsOffline(result.measurements);
        return result.measurements;
      } else {
        throw new Error(result.error || 'Failed to load measurements');
      }
    } catch (error) {
      console.error('Failed to load measurements online:', error);

      // Load from offline storage as fallback
      try {
        const offlineMeasurements = await offlineStorage.loadMeasurementsOffline();
        return offlineMeasurements;
      } catch (offlineError) {
        console.error('Failed to load offline measurements:', offlineError);
        return [];
      }
    }
  }

  // Sync pending measurement operations
  static async syncPendingMeasurements(): Promise<void> {
    const pendingOps = await offlineStorage.getPendingOperations();
    const measurementOps = pendingOps.filter(op => op.type === 'measurement_save');

    for (const op of measurementOps) {
      try {
        const result = await MeasurementService.createMeasurement(op.data);

        if (result.success) {
          await offlineStorage.removePendingOperation(op.id);
        } else {
          // Increment retry count
          await offlineStorage.updatePendingOperation(op.id, {
            retryCount: op.retryCount + 1
          });
        }
      } catch (error) {
        console.error('Failed to sync measurement:', error);
        // Increment retry count
        await offlineStorage.updatePendingOperation(op.id, {
          retryCount: op.retryCount + 1
        });
      }
    }
  }

  // Clear old pending operations (after too many retries)
  static async cleanupOldPendingOperations(maxRetries: number = 3): Promise<void> {
    const pendingOps = await offlineStorage.getPendingOperations();
    const oldOps = pendingOps.filter(op => op.retryCount >= maxRetries);

    for (const op of oldOps) {
      await offlineStorage.removePendingOperation(op.id);
    }
  }
}