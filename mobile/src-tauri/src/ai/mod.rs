// On-device AI seams.
//
// This module stages two integration points that stay OFF by default (see the
// `engine` / `node` cargo features). Keeping them cfg-gated means the default
// build pulls in no model runtime and `cargo check` is fast and dependency-light.
//
// When ready, wire these to the real crates:
//   - feature `engine` -> hanzoai/engine  (local inference: GGUF/MLX/Metal, the
//     same engine that powers Hanzo Engine on desktop).
//   - feature `node`   -> hanzoai/node    (device registration + peer mesh so a
//     phone can join a user's Hanzo compute fabric).
//
// The command surface is identical whether or not the features are enabled, so
// the JS side can always call them; disabled builds return a clear status.

use serde::Serialize;

#[derive(Serialize)]
pub struct EngineStatus {
    pub enabled: bool,
    pub detail: String,
}

#[derive(Serialize)]
pub struct DeviceRegistration {
    pub registered: bool,
    pub detail: String,
}

/// Report whether the local inference engine is compiled in and ready.
#[tauri::command]
pub fn engine_status() -> EngineStatus {
    #[cfg(feature = "engine")]
    {
        // TODO(engine): probe hanzoai/engine — loaded model, backend, VRAM.
        EngineStatus {
            enabled: true,
            detail: "engine feature enabled (runtime not yet wired)".into(),
        }
    }
    #[cfg(not(feature = "engine"))]
    {
        EngineStatus {
            enabled: false,
            detail: "not built with engine".into(),
        }
    }
}

/// Register this device with the user's Hanzo node mesh.
#[tauri::command]
pub fn device_register(_name: Option<String>) -> DeviceRegistration {
    #[cfg(feature = "node")]
    {
        // TODO(node): register with hanzoai/node — keypair, enroll, join mesh.
        DeviceRegistration {
            registered: true,
            detail: "node feature enabled (mesh join not yet wired)".into(),
        }
    }
    #[cfg(not(feature = "node"))]
    {
        DeviceRegistration {
            registered: false,
            detail: "not built with node".into(),
        }
    }
}
