
use tauri::{AppHandle, Manager, Emitter};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use crate::firewall::common::BlockedDomains;
use super::utils::log_debug;

// Structure to track recent access attempts to avoid spam
#[derive(Clone)]
struct AccessAttempt {
    #[allow(dead_code)]
    domain: String,
    #[allow(dead_code)]
    ip: String,
    timestamp: u64,
    count: u32,
}

// Global state for monitoring
lazy_static::lazy_static! {
    static ref MONITOR_ACTIVE: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    static ref RECENT_ATTEMPTS: Arc<Mutex<HashMap<String, AccessAttempt>>> = Arc::new(Mutex::new(HashMap::new()));
}

const NOTIFICATION_COOLDOWN_SECONDS: u64 = 30;
const CLEANUP_INTERVAL_SECONDS: u64 = 300;

#[tauri::command]
pub async fn start_domain_access_monitor(app: AppHandle) -> Result<(), String> {
    let mut is_active = MONITOR_ACTIVE.lock().unwrap();
    if *is_active {
        return Ok(());
    }
    *is_active = true;
    drop(is_active);
    
    let app_clone = app.clone();
    thread::spawn(move || {
        monitor_domain_access_loop(app_clone);
    });
    
    Ok(())
}

#[tauri::command]
pub async fn stop_domain_access_monitor() -> Result<(), String> {
    let mut is_active = MONITOR_ACTIVE.lock().unwrap();
    *is_active = false;
    Ok(())
}

#[tauri::command]
pub async fn is_domain_access_monitor_active() -> Result<bool, String> {
    let is_active = MONITOR_ACTIVE.lock().unwrap();
    Ok(*is_active)
}

fn monitor_domain_access_loop(app: AppHandle) {
    let mut last_cleanup = get_current_timestamp();
    
    let rt = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(_) => return,
    };
    
    while is_monitor_active() {
        if let Err(e) = rt.block_on(check_for_blocked_domain_access(&app)) {
            log_debug(&format!("Error checking for blocked domain access: {}", e));
        }
          let current_time = get_current_timestamp();
        if current_time - last_cleanup > CLEANUP_INTERVAL_SECONDS {
            cleanup_old_attempts();
            last_cleanup = current_time;
        }
        
        thread::sleep(Duration::from_secs(5));
    }
}

async fn check_for_blocked_domain_access(app: &AppHandle) -> Result<(), String> {
    let blocked_domains = get_blocked_domains_set(app)?;
    
    if blocked_domains.is_empty() {
        return Ok(());
    }
    
    match crate::network_traffic_analysis::suricata::read_alert_events() {
        Ok(alerts) => {
            for alert in alerts {
                if let Some(dest_ip) = &alert.dest_ip {
                    if let Some(domain) = check_ip_against_blocked_domains(app, dest_ip, &blocked_domains).await {
                        handle_blocked_domain_access(app, &domain, dest_ip, &alert)?;
                    }
                }
            }
        },
        Err(_) => {}
    }
    
    Ok(())
}

fn get_blocked_domains_set(app: &AppHandle) -> Result<HashSet<String>, String> {
    let state = app.state::<BlockedDomains>();
    let domains = state.domains.lock().unwrap();
    Ok(domains.iter().cloned().collect())
}

async fn check_ip_against_blocked_domains(
    _app: &AppHandle,
    _ip: &str, 
    _blocked_domains: &HashSet<String>
) -> Option<String> {
    None
}

fn handle_blocked_domain_access(
    app: &AppHandle,
    domain: &str,
    ip: &str,
    alert: &crate::network_traffic_analysis::suricata::AlertEvent
) -> Result<(), String> {
    use tauri::Manager;
    use crate::firewall::common::NotificationState;
    
    let current_time = get_current_timestamp();
    let access_key = format!("{}:{}", domain, ip);
    
    let notification_state = app.state::<NotificationState>();
    let settings = notification_state.settings.lock().unwrap();
    let cooldown_seconds = settings.cooldown_seconds;
    drop(settings);
    
    let mut recent_attempts = RECENT_ATTEMPTS.lock().unwrap();
    let should_notify = match recent_attempts.get(&access_key) {
        Some(attempt) => {
            let last_timestamp = attempt.timestamp;
            let mut updated_attempt = attempt.clone();
            updated_attempt.count += 1;
            updated_attempt.timestamp = current_time;
            recent_attempts.insert(access_key.clone(), updated_attempt);
            
            current_time - last_timestamp > cooldown_seconds
        },
        None => {
            recent_attempts.insert(access_key, AccessAttempt {
                domain: domain.to_string(),
                ip: ip.to_string(),
                timestamp: current_time,
                count: 1,
            });
            true
        }
    };
    
    drop(recent_attempts);
    
    if should_notify {
        send_blocked_domain_notification(app, domain, ip, alert)?;
    }
    
    Ok(())
}

fn send_blocked_domain_notification(
    app: &AppHandle,
    domain: &str,
    ip: &str,
    alert: &crate::network_traffic_analysis::suricata::AlertEvent
) -> Result<(), String> {
    use tauri::Manager;
    use crate::firewall::common::NotificationState;
    
    let notification_state = app.state::<NotificationState>();
    let settings = notification_state.settings.lock().unwrap();
    
    if !settings.enabled {
        return Ok(());
    }
    
    let delay_seconds = settings.domain_blocked_delay_seconds;
    drop(settings);
    
    let app_clone = app.clone();
    let domain_clone = domain.to_string();
    let ip_clone = ip.to_string();
    let alert_clone = alert.clone();
    
    tauri::async_runtime::spawn(async move {
        if delay_seconds > 0 {
            tokio::time::sleep(tokio::time::Duration::from_secs(delay_seconds)).await;
        }
        
        if let Err(e) = app_clone.emit("domain-access-blocked-notification", serde_json::json!({
            "domain": domain_clone,
            "ip": ip_clone,
            "timestamp": alert_clone.timestamp,
            "signature": alert_clone.signature
        })) {
            log_debug(&format!("Failed to emit domain access blocked event: {}", e));
        }
    });
    
    Ok(())
}

fn is_monitor_active() -> bool {
    let is_active = MONITOR_ACTIVE.lock().unwrap();
    *is_active
}

fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn cleanup_old_attempts() {
    let current_time = get_current_timestamp();
    let mut recent_attempts = RECENT_ATTEMPTS.lock().unwrap();
    
    recent_attempts.retain(|_, attempt| {
        current_time - attempt.timestamp < 600
    });
}


