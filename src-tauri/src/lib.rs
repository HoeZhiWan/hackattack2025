mod network_traffic_analysis;
mod firewall;
mod tray;
mod assistant;

use firewall::{
    FirewallState, 
    BlockedDomains,
    get_firewall_rules, 
    add_firewall_rule, 
    remove_firewall_rule, 
    enable_disable_rule,
    get_blocked_domains,
    block_domain,
    unblock_domain
};
use firewall::common::{NotificationState, NotificationSettings};
use tauri::AppHandle;
use network_traffic_analysis::suricata::{
    is_suricata_active,
    run_suricata,
    kill_suricata,
    read_alert_events,
    extract_and_handle_events
};
use network_traffic_analysis::report::{
    read_flow_report,
    generate_flow_report,
};
use assistant::ask_ai;
use tray::{
    is_tray_active,
    update_tray_tooltip,
    toggle_tray_state,
    set_tray_state,
    get_tray_state,
    TrayState
};

#[tauri::command]
fn check_tray_status() -> bool {
    is_tray_active()
}

#[tauri::command]
fn set_tray_tooltip(message: String) -> Result<(), String> {
    update_tray_tooltip(&message)
}

#[tauri::command]
fn toggle_tray_status(app: AppHandle) -> Result<TrayState, String> {
    toggle_tray_state(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_tray_status(app: AppHandle, state: TrayState) -> Result<(), String> {
    set_tray_state(&app, state).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_tray_status() -> TrayState {
    get_tray_state()
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_notification(title: String, message: String, app: AppHandle) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    
    app.notification()
        .builder()
        .title(&title)
        .body(&message)
        .show()
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn show_domain_blocked_notification(
    domain: String, 
    app: AppHandle,
    state: tauri::State<'_, NotificationState>
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    use tokio::time::{sleep, Duration};
      let delay_seconds = {
        let settings = state.settings.lock().unwrap();
        if !settings.enabled {
            return Ok(());
        }
        settings.domain_blocked_delay_seconds
    };
      if delay_seconds > 0 {
        sleep(Duration::from_secs(delay_seconds)).await;
    }
    
    let title = "🚫 Domain Blocked";
    let body = format!("Domain {} has been blocked by Security Smile. Click to learn more.", domain);
      app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show()
        .map_err(|e| format!("Failed to send notification: {}", e))?;    Ok(())
}

#[tauri::command]
async fn create_popup_alert(
    title: String, 
    message: String, 
    alert_type: String,
    app: AppHandle
) -> Result<(), String> {
    use tauri::{WebviewWindowBuilder, WebviewUrl};
    
    let window_label = format!("popup-alert-{}", 
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );
    
    let encoded_title = urlencoding::encode(&title);
    let encoded_message = urlencoding::encode(&message);
    let encoded_type = urlencoding::encode(&alert_type);
    
    let popup_url = format!(
        "http://localhost:3000/popup-alert?title={}&message={}&type={}", 
        encoded_title, encoded_message, encoded_type
    );
    
    WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(popup_url.parse().unwrap())
    )
    .title(&format!("Alert: {}", title))
    .inner_size(400.0, 300.0)
    .min_inner_size(350.0, 250.0)
    .max_inner_size(600.0, 500.0)
    .center()
    .resizable(true)
    .always_on_top(true)
    .skip_taskbar(false)
    .focused(true)    .build()
    .map_err(|e| format!("Failed to create popup window: {}", e))?;    Ok(())
}

#[tauri::command]
async fn get_notification_settings(
    state: tauri::State<'_, NotificationState>
) -> Result<NotificationSettings, String> {
    let settings = state.settings.lock().unwrap();
    Ok(settings.clone())
}

#[tauri::command]
async fn set_notification_settings(
    new_settings: NotificationSettings,
    state: tauri::State<'_, NotificationState>
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    *settings = new_settings;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(FirewallState::default())
        .manage(BlockedDomains::default())
        .manage(NotificationState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_firewall_rules,
            add_firewall_rule,
            remove_firewall_rule,
            enable_disable_rule,
            get_blocked_domains,
            block_domain,
            unblock_domain,
            is_suricata_active,
            run_suricata,
            kill_suricata,
            read_alert_events,
            extract_and_handle_events,
            ask_ai,
            send_notification,
            show_domain_blocked_notification,
            read_flow_report,
            generate_flow_report,
            create_popup_alert,
            get_notification_settings,
            set_notification_settings,
            check_tray_status,
            set_tray_tooltip,
            toggle_tray_status,
            set_tray_status,
            get_tray_status
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            let rt = tokio::runtime::Runtime::new()
                .expect("Failed to create Tokio runtime");
              rt.block_on(async {
                if let Err(_) = firewall::domain_blocking::initialize_blocked_domains(app_handle.clone()).await {
                    // Failed to initialize blocked domains from file
                }            
            });

            let app_handle = app.handle();
            tray::cleanup_tray();
            tray::create_tray(app_handle)?;
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
