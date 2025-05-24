// rules.rs - Functions for managing Windows Firewall rules
use tauri::{AppHandle, State};
use crate::firewall::common::{FirewallError, FirewallRuleInfo, FirewallState, run_netsh_command};

// Parse the output of netsh advfirewall firewall show rule command
fn parse_firewall_rules(output: &str) -> Result<Vec<FirewallRuleInfo>, FirewallError> {
    let mut rules = Vec::new();
    let mut current_rule: Option<FirewallRuleInfo> = None;
    
    for line in output.lines() {
        let line = line.trim();
        
        // New rule starts with a rule name
        if line.starts_with("Rule Name:") {
            // Save the previous rule if it exists
            if let Some(rule) = current_rule.take() {
                rules.push(rule);
            }
            
            // Start a new rule
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
            // Update the current rule with details
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
    
    // Don't forget to add the last rule
    if let Some(rule) = current_rule {
        rules.push(rule);
    }
    
    Ok(rules)
}

// Commands exposed to the frontend
#[tauri::command]
pub async fn get_firewall_rules(app: AppHandle, state: State<'_, FirewallState>) -> Result<Vec<FirewallRuleInfo>, String> {
    println!("Fetching all firewall rules...");
    
    // Use netsh to get all firewall rules
    let output = match run_netsh_command(&app, vec!["advfirewall", "firewall", "show", "rule", "name=all"]).await {
        Ok(output) => output,
        Err(e) => {
            println!("Error fetching firewall rules: {}", e);
            return Err(e.to_string());
        }
    };
    
    // Parse the output into our FirewallRuleInfo structs
    match parse_firewall_rules(&output) {
        Ok(rules) => {
            println!("Successfully fetched {} firewall rules", rules.len());
            // Update the state
            let mut state_rules = state.rules.lock().unwrap();
            *state_rules = rules.clone();
            Ok(rules)
        },
        Err(e) => {
            println!("Error parsing firewall rules: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn add_firewall_rule(
    app: AppHandle,
    rule_info: FirewallRuleInfo,
    state: State<'_, FirewallState>
) -> Result<(), String> {
    println!("Adding new firewall rule: {}", rule_info.name);
    
    // Convert values to strings first to extend their lifetime
    let direction_lower = rule_info.direction.to_lowercase();
    let action_lower = rule_info.action.to_lowercase();
    // Pre-create protocol string if needed
    let protocol_lower = if rule_info.protocol != "Any" {
        Some(rule_info.protocol.to_lowercase())
    } else {
        None
    };
    // Pre-create port string if needed
    let port_str = rule_info.port.map(|p| p.to_string());

    // Build the netsh command for adding a rule
    let mut args = vec![
        "advfirewall", "firewall", "add", "rule",
        "name", &rule_info.name,
        "dir", &direction_lower,
        "action", &action_lower,
    ];
    
    // Add description if not empty
    if !rule_info.description.is_empty() {
        args.push("description");
        args.push(&rule_info.description);
    }
    
    // Add protocol if specified
    if let Some(ref proto) = protocol_lower {
        args.push("protocol");
        args.push(proto);
    }
    
    // Add program path if specified
    if let Some(path) = &rule_info.application_path {
        if !path.is_empty() {
            args.push("program");
            args.push(path);
        }
    }
    
    // Add local port if specified
    if let Some(ref port) = port_str {
        args.push("localport");
        args.push(port);
    }
    
    // Add enabled status
    args.push("enable");
    args.push(if rule_info.enabled { "yes" } else { "no" });
    
    // Execute the command
    match run_netsh_command(&app, args).await {
        Ok(_) => {
            println!("Successfully added firewall rule: {}", rule_info.name);
            // Update our state
            let mut rules = state.rules.lock().unwrap();
            rules.push(rule_info);
            Ok(())
        },
        Err(e) => {
            println!("Error adding firewall rule: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn remove_firewall_rule(
    app: AppHandle,
    rule_name: String,
    state: State<'_, FirewallState>
) -> Result<(), String> {
    println!("Removing firewall rule: {}", rule_name);
    
    // Build the netsh command for removing a rule
    let args = vec!["advfirewall", "firewall", "delete", "rule", "name", &rule_name];
    
    // Execute the command
    match run_netsh_command(&app, args).await {
        Ok(_) => {
            println!("Successfully removed firewall rule: {}", rule_name);
            // Update our state
            let mut rules = state.rules.lock().unwrap();
            rules.retain(|r| r.name != rule_name);
            Ok(())
        },
        Err(e) => {
            println!("Error removing firewall rule: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn enable_disable_rule(
    app: AppHandle,
    rule_name: String,
    enable: bool,
    state: State<'_, FirewallState>
) -> Result<(), String> {
    println!("{} firewall rule: {}", if enable { "Enabling" } else { "Disabling" }, rule_name);
    
    // Build the netsh command for enabling/disabling a rule
    let args = vec!["advfirewall", "firewall", "set", "rule", 
                    "name", &rule_name, 
                    "new", "enable", if enable { "yes" } else { "no" }];
    
    // Execute the command
    match run_netsh_command(&app, args).await {
        Ok(_) => {
            println!("Successfully {} firewall rule: {}", 
                     if enable { "enabled" } else { "disabled" }, 
                     rule_name);
            // Update our state
            let mut rules = state.rules.lock().unwrap();
            for r in rules.iter_mut() {
                if r.name == rule_name {
                    r.enabled = enable;
                    break;
                }
            }
            Ok(())
        },
        Err(e) => {
            println!("Error {} firewall rule: {}", 
                     if enable { "enabling" } else { "disabling" }, 
                     e);
            Err(e.to_string())
        }
    }
}

