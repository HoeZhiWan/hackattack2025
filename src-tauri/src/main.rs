// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod assistant;

fn main() {
    dotenv::dotenv().ok();

    // Initialize your library or app logic before starting Tauri
    hackattack_lib::run();

    // Start Tauri app and register commands
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![assistant::ask_ai])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

