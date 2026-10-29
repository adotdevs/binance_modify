import { EventEmitter } from 'events';

// Global singleton EventEmitter to persist across HMR and module reloads
if (!global._overlayEventEmitter) {
  global._overlayEventEmitter = new EventEmitter();
  global._overlayEventEmitter.setMaxListeners(200);
}

const emitter = global._overlayEventEmitter;

export function broadcastUpdate(payload) {
  try {
    emitter.emit('overlay_update', {
      timestamp: Date.now(),
      ...payload,
    });
  } catch (err) {
    console.warn('[Events] broadcast error:', err);
  }
}

export function subscribeToUpdates(listener) {
  emitter.on('overlay_update', listener);
  return () => {
    emitter.off('overlay_update', listener);
  };
}

export default emitter;
