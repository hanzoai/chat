mod ai;

// Shared entry point for desktop and mobile (iOS/Android call this from their
// generated launchers). Registers the fs + http plugins the webview uses for
// provider-usage reads and cross-origin API calls (scopes live in
// capabilities/default.json), plus the on-device AI command stubs.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            ai::engine_status,
            ai::device_register
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hanzo AI");
}
