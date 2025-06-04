pub mod utils;
pub mod monitor;

use tauri::{AppHandle, State, Manager, Emitter};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use crate::firewall::common::{BlockedDomains, run_elevated_powershell};
use utils::log_debug;

fn get_domains_file_path(app: &AppHandle) -> PathBuf {
    let app_data_dir = match app.app_handle().path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => {
            log_debug("Failed to get app data directory, using current directory");
            std::env::current_dir().unwrap_or_default()
        }
    };
    
    if !app_data_dir.exists() {
        if let Err(e) = fs::create_dir_all(&app_data_dir) {
            log_debug(&format!("Failed to create app data directory: {}", e));
        }
    }
    
    app_data_dir.join("blocked_domains.json")
}

async fn save_domains_to_file(app: &AppHandle, domains: &Vec<String>) -> Result<(), String> {
    let file_path = get_domains_file_path(app);
    let json = serde_json::to_string_pretty(domains)
        .map_err(|e| format!("Failed to serialize domains: {}", e))?;
    
    File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))
        .and_then(|mut file| {
            file.write_all(json.as_bytes())
                .map_err(|e| format!("Failed to write to file: {}", e))
        })?;
    
    Ok(())
}

async fn load_domains_from_file(app: &AppHandle) -> Result<Vec<String>, String> {
    let file_path = get_domains_file_path(app);
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    
    let mut file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut json = String::new();
    file.read_to_string(&mut json)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let domains: Vec<String> = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to deserialize domains: {}", e))?;
    
    Ok(domains)
}

pub async fn initialize_blocked_domains(app: AppHandle) -> Result<(), String> {
    match load_domains_from_file(&app).await {
        Ok(domains) => {
            let state = app.state::<BlockedDomains>();
            let mut state_domains = state.domains.lock().unwrap();
            *state_domains = domains;
            Ok(())
        },
        Err(e) => Err(e)
    }
}

#[tauri::command]
pub async fn get_blocked_domains(state: State<'_, BlockedDomains>) -> Result<Vec<String>, String> {
    let domains = state.domains.lock().unwrap();
    Ok(domains.clone())
}

#[tauri::command]
pub async fn block_domain(
    app: AppHandle,
    domain: String,
    state: State<'_, BlockedDomains>
) -> Result<(), String> {
    if !utils::is_valid_domain_format(&domain) {
        return Err(format!("Invalid domain format: {}", domain));
    }
    
    let outbound_rule_prefix = format!("Block-Domain-Outbound-{}", domain);
    let inbound_rule_prefix = format!("Block-Domain-Inbound-{}", domain);
    
    let ip_addresses = match utils::resolve_domain_to_ips(&app, &domain).await {
        Ok(ips) => ips,
        Err(_) => utils::try_alternative_resolution(&app, &domain).await
            .map_err(|e| format!("Failed to resolve domain {}: {}", domain, e))?,
    };
    
    if ip_addresses.is_empty() {
        return Err(format!("No IP addresses found for domain: {}", domain));
    }
    
    let mut ps_script = String::new();
    ps_script.push_str("$ErrorActionPreference = 'Stop'\ntry {\n");
    
    for (index, ip_address) in ip_addresses.iter().enumerate() {
        let outbound_rule_name = if ip_addresses.len() > 1 {
            format!("{}-{}", outbound_rule_prefix, index + 1)
        } else {
            outbound_rule_prefix.clone()
        };
        
        let inbound_rule_name = if ip_addresses.len() > 1 {
            format!("{}-{}", inbound_rule_prefix, index + 1)
        } else {
            inbound_rule_prefix.clone()
        };
        
        let outbound_description = format!("Blocks outgoing connections to domain: {} (IP: {})", domain, ip_address);
        let inbound_description = format!("Blocks incoming connections from domain: {} (IP: {})", domain, ip_address);
        
        ps_script.push_str(&format!(
            "    netsh advfirewall firewall add rule name=\"{}\" dir=out action=block enable=yes protocol=any description=\"{}\" remoteip={}\n",
            outbound_rule_name, outbound_description, ip_address
        ));
        
        ps_script.push_str(&format!(
            "    netsh advfirewall firewall add rule name=\"{}\" dir=in action=block enable=yes protocol=any description=\"{}\" remoteip={}\n",
            inbound_rule_name, inbound_description, ip_address
        ));
    }
    
    ps_script.push_str("    Write-Host \"Successfully created all firewall rules\"\n");
    ps_script.push_str("} catch {\n");
    ps_script.push_str("    Write-Host \"Error creating firewall rules: $_\"\n");
    ps_script.push_str("    exit 1\n");
    ps_script.push_str("}\n");
    
    run_elevated_powershell(&app, &ps_script).await
        .map_err(|e| format!("Failed to create firewall rules for domain {}: {}", domain, e))?;
    
    {
        let mut domains = state.domains.lock().unwrap();
        if !domains.contains(&domain) {
            domains.push(domain.clone());
        }
    }
    
    let domains_clone = { state.domains.lock().unwrap().clone() };
    let _ = save_domains_to_file(&app, &domains_clone).await;
    
    if let Err(e) = app.emit("domain-blocked-notification", &domain) {
        log_debug(&format!("Failed to emit domain blocked event: {}", e));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn unblock_domain(
    app: AppHandle,
    domain: String,
    state: State<'_, BlockedDomains>
) -> Result<(), String> {
    let outbound_rule_prefix = format!("Block-Domain-Outbound-{}", domain);
    let inbound_rule_prefix = format!("Block-Domain-Inbound-{}", domain);
    
    let mut ps_script = String::new();
    ps_script.push_str("$ErrorActionPreference = 'Continue'\n$removed_count = 0\n\n");
    
    // Add base rule deletion commands
    ps_script.push_str(&format!(
        "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
        outbound_rule_prefix
    ));
    
    ps_script.push_str(&format!(
        "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
        inbound_rule_prefix
    ));
    
    // Add numbered rule deletion commands (up to 20)
    for i in 1..20 {
        let numbered_outbound_rule = format!("{}-{}", outbound_rule_prefix, i);
        let numbered_inbound_rule = format!("{}-{}", inbound_rule_prefix, i);
        
        ps_script.push_str(&format!(
            "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
            numbered_outbound_rule
        ));
        
        ps_script.push_str(&format!(
            "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
            numbered_inbound_rule
        ));
    }
    
    // Add legacy rule deletion
    let old_rule_name = format!("Block-Domain-{}", domain);
    ps_script.push_str(&format!(
        "try {{ netsh advfirewall firewall delete rule name=\"{}\"; $removed_count++ }} catch {{ Write-Host \"Rule not found\" }}\n",
        old_rule_name
    ));
    
    ps_script.push_str(&format!("\nWrite-Host \"Removed $removed_count firewall rules for domain: {}\"\n", domain));
      run_elevated_powershell(&app, &ps_script).await
        .map_err(|e| format!("Failed to remove firewall rules for domain {}: {}", domain, e))?;
    
    let domains_clone = {
        let mut domains = state.domains.lock().unwrap();
        domains.retain(|d| d != &domain);
        domains.clone()
    };
    
    let _ = save_domains_to_file(&app, &domains_clone).await;
    
    Ok(())
}