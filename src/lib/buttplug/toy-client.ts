import { loadButtplugEsm } from "./load-buttplug";

let client: any = null;
let lastSentVibration = -1;
let pendingVibration: number | null = null;
let hardwareOperationPromise: Promise<any> = Promise.resolve();
let isProcessingVibration = false;
let activeDeviceIndices: Set<number> = new Set();
let connectionMode: 'wasm' | 'intiface' = 'wasm';

export function getConnectionMode(): 'wasm' | 'intiface' {
  return connectionMode;
}

function attachDeviceListeners(c: any) {
  c.on("deviceadded", (device: any) => {
    activeDeviceIndices.add(device.index);
    console.log(`[ToyClient] Device armed: ${device.name} (ID: ${device.index})`);
  });
  c.on("deviceremoved", (device: any) => {
    activeDeviceIndices.delete(device.index);
    console.log(`[ToyClient] Device lost: ${device.name}`);
  });
}

/**
 * Tears down any active client so a new connector can be used.
 */
export async function disconnectToyClient() {
  if (!client) return;
  try {
    await client.stopAllDevices();
    await client.disconnect();
  } catch {}
  client = null;
  connectionMode = 'wasm';
  activeDeviceIndices.clear();
  lastSentVibration = -1;
  pendingVibration = null;
  isProcessingVibration = false;
  hardwareOperationPromise = Promise.resolve();
  console.log("[ToyClient] Disconnected and reset.");
}

/**
 * Initializes the Buttplug client with the in-browser WASM connector (WebBluetooth).
 */
export async function initToyClient() {
  if (client) return client;
  const { ButtplugClient, ButtplugWasmClientConnector } = await loadButtplugEsm();
  client = new ButtplugClient("ToyCommander");
  const connector = new ButtplugWasmClientConnector();
  await client.connect(connector);
  connectionMode = 'wasm';
  console.log("[ToyClient] WASM engine initialized.");

  if (client.devices) {
    client.devices.forEach((d: any) => {
      activeDeviceIndices.add(d.index);
      console.log(`[ToyClient] Pre-connected device armed: ${d.name} (ID: ${d.index})`);
    });
  }

  attachDeviceListeners(client);
  return client;
}

/**
 * Initializes the Buttplug client connected to a running Intiface Central server.
 * Throws if the server is unreachable.
 */
export async function initToyClientIntiface(serverUrl: string) {
  await disconnectToyClient();
  const { ButtplugClient, ButtplugBrowserWebsocketClientConnector } = await loadButtplugEsm();
  client = new ButtplugClient("ToyCommander");
  const connector = new ButtplugBrowserWebsocketClientConnector(serverUrl);
  await client.connect(connector); // throws if Intiface is not running
  connectionMode = 'intiface';
  console.log(`[ToyClient] Connected to Intiface Central at ${serverUrl}`);

  if (client.devices) {
    client.devices.forEach((d: any) => {
      activeDeviceIndices.add(d.index);
      console.log(`[ToyClient] Intiface device armed: ${d.name} (ID: ${d.index})`);
    });
  }

  attachDeviceListeners(client);
  return client;
}

export function getClient() {
  return client;
}

export function isClientReady() {
  return client && client.connected;
}

export function setActiveDevices(indices: number[]) {
  console.log("[ToyClient] Updating active hardware list:", indices);
  activeDeviceIndices = new Set(indices);
}

export function getActiveDeviceIndices() {
  return Array.from(activeDeviceIndices);
}

/**
 * Executes a hardware operation strictly after any previous one finishes.
 */
async function executeHardwareOperation<T>(op: () => Promise<T>): Promise<T | null> {
  const previousOp = hardwareOperationPromise;
  
  hardwareOperationPromise = (async () => {
    try {
      await previousOp;
    } catch (e) {
      // Ignore errors from previous ops
    }
    
    const startTime = performance.now();
    try {
      const result = await op();
      const endTime = performance.now();
      // Mandatory settle time for BLE radio stability
      const settleTime = 65;
      await new Promise(resolve => setTimeout(resolve, settleTime));
      console.debug(`[ToyClient] HW Op Complete. Took: ${Math.round(endTime - startTime)}ms + ${settleTime}ms settle.`);
      return result;
    } catch (err) {
      console.error("[ToyClient] HW Op ERROR:", err);
      return null;
    }
  })();

  return hardwareOperationPromise;
}

export async function stopAllDevices() {
  console.log("[ToyClient] STOP ALL requested.");
  pendingVibration = null;
  lastSentVibration = 0;

  if (!client || !client.connected) return;

  return executeHardwareOperation(async () => {
    try {
      await client.stopAllDevices();
    } catch (err) {
      console.warn("[ToyClient] stopAllDevices failed:", err);
    }
  });
}

export async function requestBatterySafe(device: any): Promise<number | null> {
  if (!device || typeof device.battery !== 'function') return null;

  return executeHardwareOperation(async () => {
    try {
      return await device.battery();
    } catch (e) {
      return null;
    }
  });
}

export async function applyVibrationSafe(val: number) {
  // Store latest value
  pendingVibration = val;

  if (isProcessingVibration) return;

  const currentClient = getClient();
  if (!currentClient || !currentClient.connected || currentClient.devices.length === 0) {
    return;
  }

  isProcessingVibration = true;
  console.log(`[ToyClient] Vibrate processing started: ${Math.round(val * 100)}%`);

  try {
    while (pendingVibration !== null) {
      const targetVal = pendingVibration;
      pendingVibration = null;

      if (targetVal === lastSentVibration) continue;

      await executeHardwareOperation(async () => {
        lastSentVibration = targetVal;
        console.debug(`[ToyClient] Writing to HW: ${Math.round(targetVal * 100)}% on ${activeDeviceIndices.size} device(s)`);
        
        for (const device of currentClient.devices) {
          if (device.vibrate) {
            if (activeDeviceIndices.has(device.index)) {
              try {
                await device.vibrate(targetVal);
              } catch (err) {
                console.warn(`[ToyClient] Write failed for ${device.name}:`, err);
              }
            } else {
              // Ensure disarmed devices stay off
              try {
                await device.vibrate(0);
              } catch (err) {}
            }
          }
        }
      });
    }
  } finally {
    isProcessingVibration = false;
    console.log("[ToyClient] Vibrate processing finished.");
  }
}

export function toggleAllDevices(arm: boolean) {
  const currentClient = getClient();
  if (!currentClient || !currentClient.connected) return;
  
  if (arm) {
    currentClient.devices.forEach((d: any) => activeDeviceIndices.add(d.index));
  } else {
    activeDeviceIndices.clear();
  }
  console.log(`[ToyClient] All devices ${arm ? 'ARMED' : 'DISARMED'}`);
}
