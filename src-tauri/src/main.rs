#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod assistant;

fn main() {
    dotenv::dotenv().ok();
    security_smile_lib::run();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![assistant::ask_ai])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

