use tauri::AppHandle;
use regex::Regex;
use crate::firewall::common::run_shell_command;

pub fn log_debug(_message: &str) {
}

pub fn is_valid_domain_format(domain: &str) -> bool {
    let domain_regex = Regex::new(r"^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$").unwrap();
    domain_regex.is_match(domain)
}

pub fn extract_ips_from_nslookup(nslookup_output: &str) -> Vec<String> {
    let mut ips = Vec::new();
    let mut in_addresses_section = false;
    
    for line in nslookup_output.lines() {
        let trimmed = line.trim();
        
        if trimmed.starts_with("Addresses:") {
            in_addresses_section = true;
            
            if let Some(first_ip) = trimmed.strip_prefix("Addresses:").map(|s| s.trim()) {
                if !first_ip.is_empty() && is_valid_ip_format(first_ip) {
                    ips.push(first_ip.to_string());
                }
            }
            continue;
        }
        
        if in_addresses_section && trimmed.len() > 0 {
            if !is_valid_ip_format(trimmed) && !line.starts_with(" ") {
                in_addresses_section = false;
                continue;
            }
            
            if is_valid_ip_format(trimmed) {
                ips.push(trimmed.to_string());
            }
            continue;
        }
        
        if trimmed.starts_with("Address:") && !trimmed.contains("192.168.") {
            if let Some(ip) = trimmed.strip_prefix("Address:").map(|s| s.trim()) {
                if is_valid_ip_format(ip) {
                    ips.push(ip.to_string());
                }
            }
        }
    }
    
    ips
}

pub fn extract_ip_from_ping(ping_output: &str) -> Option<String> {
    for line in ping_output.lines() {
        if line.contains("Pinging") && line.contains("[") && line.contains("]") {
            if let Some(start) = line.find('[') {
                if let Some(end) = line.find(']') {
                    if start < end {
                        let ip = &line[(start + 1)..end];
                        return Some(ip.to_string());
                    }
                }
            }
        }
    }
    None
}

pub async fn resolve_domain_to_ips(app: &AppHandle, domain: &str) -> Result<Vec<String>, String> {
    let nslookup_output = run_shell_command(app, "cmd", vec!["/c", &format!("nslookup {}", domain)]).await
        .map_err(|e| format!("Failed to execute nslookup command: {}", e))?;
    
    let ips = extract_ips_from_nslookup(&nslookup_output);
    
    if !ips.is_empty() {
        return Ok(ips);
    }
    
    match resolve_domain_to_ip(app, domain).await {
        Ok(ip) => Ok(vec![ip]),
        Err(e) => Err(e)
    }
}

pub async fn resolve_domain_to_ip(app: &AppHandle, domain: &str) -> Result<String, String> {
    let ip_output = run_shell_command(app, "ping", vec!["-n", "1", "-4", domain]).await
        .map_err(|e| format!("Failed to execute ping command: {}", e))?;
    
    if let Some(ip) = extract_ip_from_ping(&ip_output) {
        if is_valid_ip_format(&ip) {
            return Ok(ip);
        } else {
            return Err(format!("Extracted IP has invalid format: {}", ip));
        }
    }
    
    Err(format!("Could not resolve domain {} to IP address", domain))
}

fn is_valid_ip_format(ip: &str) -> bool {
    let ipv4_regex = Regex::new(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$").unwrap();
    let ipv6_regex = Regex::new(r"^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$").unwrap();
    
    if ipv4_regex.is_match(ip) {
        let octets: Vec<&str> = ip.split('.').collect();
        if octets.len() != 4 {
            return false;
        }
        
        for octet in octets {
            if let Ok(value) = octet.parse::<u32>() {
                if value > 255 {
                    return false;
                }
            } else {
                return false;
            }
        }
        return true;
    }
    
    ipv6_regex.is_match(ip)
}

pub async fn try_alternative_resolution(app: &AppHandle, domain: &str) -> Result<Vec<String>, String> {
    let ping_output = run_shell_command(app, "ping", vec!["-n", "1", "-4", domain]).await
        .map_err(|e| format!("Failed to execute ping command: {}", e))?;
    
    if let Some(ip) = extract_ip_from_ping(&ping_output) {
        if is_valid_ip_format(&ip) {
            return Ok(vec![ip]);
        }
    }
    
    Err(format!("Could not resolve domain using alternative methods: {}", domain))
}

