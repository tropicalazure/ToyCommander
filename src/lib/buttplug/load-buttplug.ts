/**
 * Loads Buttplug and Buttplug-WASM from CDN as ESM modules.
 * This avoids bundler issues with WASM assets and Turbopack analysis errors.
 */
export async function loadButtplugEsm(): Promise<{
  ButtplugClient: any;
  ButtplugWasmClientConnector: any;
  ButtplugBrowserWebsocketClientConnector: any;
}> {
  // Use a dynamic import bypass to prevent Turbopack from attempting to resolve remote URLs
  const importRemote = (url: string) => new Function(`return import("${url}")`)();

  try {
    const buttplugMod = await importRemote(
      "https://cdn.jsdelivr.net/npm/buttplug@3.2.1/dist/web/buttplug.mjs"
    );

    const wasmMod = await importRemote(
      "https://cdn.jsdelivr.net/npm/buttplug-wasm@2.0.1/dist/buttplug-wasm.mjs"
    );

    return {
      ButtplugClient: buttplugMod.ButtplugClient,
      ButtplugWasmClientConnector: wasmMod.ButtplugWasmClientConnector,
      ButtplugBrowserWebsocketClientConnector: buttplugMod.ButtplugBrowserWebsocketClientConnector,
    };
  } catch (error) {
    console.error("Failed to load Buttplug modules from CDN:", error);
    throw new Error("Could not initialize Buttplug engine. Check your internet connection.");
  }
}
