use tauri::{AppHandle, State};
use crate::firewall::common::{FirewallError, FirewallRuleInfo, FirewallState, run_netsh_command, run_elevated_netsh_command};

fn parse_firewall_rules(output: &str) -> Result<Vec<FirewallRuleInfo>, FirewallError> {
    let mut rules = Vec::new();
    let mut current_rule: Option<FirewallRuleInfo> = None;
    
    for line in output.lines() {
        let line = line.trim();
        
        if line.starts_with("Rule Name:") {
            if let Some(rule) = current_rule.take() {
                rules.push(rule);
            }
            
            let name = line.trim_start_matches("Rule Name:").trim().to_string();
            current_rule = Some(FirewallRuleInfo {
                name,
                description: String::new(),
                application_path: None,
                port: None,
                protocol: "Any".to_string(),
                direction: "Inbound".to_string(),
                action: "Block".to_string(),
                enabled: false,
            });
        } else if let Some(ref mut rule) = current_rule {
            if line.starts_with("Description:") {
                rule.description = line.trim_start_matches("Description:").trim().to_string();
            } else if line.starts_with("Enabled:") {
                let enabled_str = line.trim_start_matches("Enabled:").trim();
                rule.enabled = enabled_str.eq_ignore_ascii_case("Yes");
            } else if line.starts_with("Direction:") {
                rule.direction = line.trim_start_matches("Direction:").trim().to_string();
            } else if line.starts_with("Action:") {
                rule.action = line.trim_start_matches("Action:").trim().to_string();
            } else if line.starts_with("Protocol:") {
                rule.protocol = line.trim_start_matches("Protocol:").trim().to_string();
            } else if line.starts_with("Program:") {
                let program = line.trim_start_matches("Program:").trim();
                if program != "Any" {
                    rule.application_path = Some(program.to_string());
                }
            } else if line.starts_with("LocalPort:") {
                let port_str = line.trim_start_matches("LocalPort:").trim();
                if port_str != "Any" {
                    rule.port = port_str.parse::<u16>().ok();
                }
            }
        }
    }
    
    if let Some(rule) = current_rule {
        rules.push(rule);
    }
    
    Ok(rules)
}

fn quote_if_needed(s: &str) -> String {
    if s.starts_with('"') && s.ends_with('"') {
        s.to_string()
    } else {
        format!("\"{}\"", s)
    }
}

#[tauri::command]
pub async fn get_firewall_rules(app: AppHandle, state: State<'_, FirewallState>) -> Result<Vec<FirewallRuleInfo>, String> {
    let output = run_netsh_command(&app, vec!["advfirewall", "firewall", "show", "rule", "name=all"]).await
        .map_err(|e| e.to_string())?;
    
    match parse_firewall_rules(&output) {
        Ok(rules) => {
            let mut state_rules = state.rules.lock().unwrap();
            *state_rules = rules.clone();
            Ok(rules)
        },
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub async fn add_firewall_rule(
    app: AppHandle,
    rule_info: FirewallRuleInfo,
    state: State<'_, FirewallState>
) -> Result<(), String> {
    let direction_lower = match rule_info.direction.to_lowercase().as_str() {
        "inbound" => "in".to_string(),
        "outbound" => "out".to_string(),
        other => other.to_string(),
    };
    let action_lower = rule_info.action.to_lowercase();
    let protocol_lower = if rule_info.protocol != "Any" {
        Some(rule_info.protocol.to_lowercase())
    } else {
        None
    };
    let port_str = rule_info.port.map(|p| p.to_string());

    let mut args = vec![
        "advfirewall".to_string(),
        "firewall".to_string(),
        "add".to_string(),
        "rule".to_string(),
        format!("name={}", quote_if_needed(&rule_info.name)),
        format!("dir={}", direction_lower),
        format!("action={}", action_lower),
    ];
    
    if !rule_info.description.is_empty() {
        args.push(format!("description={}", rule_info.description));
    }
    
    if let Some(path) = &rule_info.application_path {
        if !path.is_empty() {
            args.push(format!("program={}", quote_if_needed(path)));
        }
    } else {
        if let Some(ref proto) = protocol_lower {
            args.push(format!("protocol={}", proto));
        }
        if let Some(ref port) = port_str {
            args.push(format!("localport={}", port));
        }
    }
    
    args.push(format!("enable={}", if rule_info.enabled { "yes" } else { "no" }));
    
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_elevated_netsh_command(&app, args_ref).await
        .map_err(|e| e.to_string())?;
    
    let mut rules = state.rules.lock().unwrap();
    rules.push(rule_info);
    Ok(())
}

#[tauri::command]
pub async fn remove_firewall_rule(
    app: AppHandle,
    rule_name: String,
    state: State<'_, FirewallState>
) -> Result<(), String> {    let args = vec![
        "advfirewall".to_string(),
        "firewall".to_string(),
        "delete".to_string(),
        "rule".to_string(),
        format!("name={}", quote_if_needed(&rule_name)),
    ];
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    
    run_elevated_netsh_command(&app, args_ref).await
        .map_err(|e| e.to_string())?;
    
    let mut rules = state.rules.lock().unwrap();
    rules.retain(|r| r.name != rule_name);
    Ok(())
}

#[tauri::command]
pub async fn enable_disable_rule(
    app: AppHandle,
    rule_name: String,
    enable: bool,
    state: State<'_, FirewallState>
) -> Result<(), String> {    let args = vec![
        "advfirewall".to_string(),
        "firewall".to_string(),
        "set".to_string(),
        "rule".to_string(),
        format!("name={}", quote_if_needed(&rule_name)),
        "new".to_string(),
        format!("enable={}", if enable { "yes" } else { "no" }),
    ];
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    
    run_elevated_netsh_command(&app, args_ref).await
        .map_err(|e| e.to_string())?;
    
    let mut rules = state.rules.lock().unwrap();
    for r in rules.iter_mut() {
        if r.name == rule_name {
            r.enabled = enable;
            break;
        }
    }
    Ok(())
}

