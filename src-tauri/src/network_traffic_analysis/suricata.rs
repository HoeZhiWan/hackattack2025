use std::env;
use std::fs::{OpenOptions, File};
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio, Child};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use pnet::datalink;
use socket2::{Socket, Domain, Type, Protocol};
use std::net::SocketAddr;
use sysinfo::System;

fn start_suricata(interface: &str, config_path: &str, log_dir: &str) -> std::io::Result<Child> {
    Command::new("suricata")
        .arg("-c").arg(config_path)
        .arg("-i").arg(interface)
        .arg("-l").arg(log_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

fn pick_internet_interface() -> Option<String> {
    for iface in datalink::interfaces() {
        if !iface.is_loopback() && iface.ips.iter().any(|ip| ip.is_ipv4()) {
            if let Some(ip) = iface.ips.iter().find(|ip| ip.is_ipv4()).map(|ip| ip.ip()) {
                let remote = SocketAddr::new("8.8.8.8".parse().unwrap(), 53);
                let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP)).ok()?;
                socket.set_nonblocking(true).ok()?;
                socket.bind(&SocketAddr::new(ip, 0).into()).ok()?;
                if socket.connect(&remote.into()).is_ok() {
                    return Some(iface.name);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn is_suricata_active() -> bool {
    let mut sys = System::new_all();
    sys.refresh_processes();
    for _process in sys.processes_by_name("suricata") {
        return true;
    }
    false
}

#[tauri::command]
pub fn run_suricata() -> Result<(), String> {
    let interface = match pick_internet_interface() {
        Some(i) => i,
        None => return Ok(()),
    };

    if is_suricata_active() {
        return Ok(());
    }

    let mut log_dir = env::temp_dir();
    log_dir.push("suricata_logs");
    let log_dir_str = log_dir.to_str().unwrap();

    let base_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("src")
        .join("network_traffic_analysis");
    let config_path = base_dir.join("suricata.yaml");
    let config_path_str = config_path.to_str().unwrap();

    std::fs::create_dir_all(log_dir_str)
        .map_err(|e| format!("Failed to create log dir: {}", e))?;    let _suricata_child = start_suricata(&interface, config_path_str, log_dir_str)
        .map_err(|e| format!("Failed to start Suricata: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn kill_suricata() {
    let mut sys = System::new_all();
    sys.refresh_processes();
    for process in sys.processes_by_name("suricata") {
        #[cfg(unix)]
        {
            process.kill_with(Signal::Term);
        }
        #[cfg(windows)]
        {
            process.kill();
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEvent {
    pub timestamp: String,
    pub src_ip: Option<String>,
    pub dest_ip: Option<String>,
    pub src_port: Option<u16>,
    pub dest_port: Option<u16>,
    pub signature: Option<String>,
    pub category: Option<String>,
    pub severity: Option<u8>,
}

#[tauri::command]
pub fn read_alert_events() -> Result<Vec<AlertEvent>, String> {
    let mut log_dir = env::temp_dir();
    log_dir.push("suricata_logs");    let mut alert_path = log_dir.clone();
    alert_path.push("alert.json");
    let alert_path_str = alert_path.to_str().unwrap();

    if !std::path::Path::new(alert_path_str).exists() {
        File::create(alert_path_str)
            .map_err(|e| format!("Failed to create alert.json: {}", e))?;
    }

    let file = File::open(alert_path_str)
        .map_err(|e| format!("Failed to open alert.json: {}", e))?;
    let reader = BufReader::new(file);
    let mut alerts = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if let Ok(json) = serde_json::from_str::<Value>(&line) {
            if json.get("event_type").and_then(|v| v.as_str()) == Some("alert") {
                let alert = AlertEvent {
                    timestamp: json.get("timestamp").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    src_ip: json.get("src_ip").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    dest_ip: json.get("dest_ip").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    src_port: json.get("src_port").and_then(|v| v.as_u64()).map(|n| n as u16),
                    dest_port: json.get("dest_port").and_then(|v| v.as_u64()).map(|n| n as u16),
                    signature: json.get("alert").and_then(|a| a.get("signature")).and_then(|v| v.as_str()).map(|s| s.to_string()),
                    category: json.get("alert").and_then(|a| a.get("category")).and_then(|v| v.as_str()).map(|s| s.to_string()),
                    severity: json.get("alert").and_then(|a| a.get("severity")).and_then(|v| v.as_u64()).map(|n| n as u8),
                };
                alerts.push(alert);
            }
        }
    }
    Ok(alerts)
}

#[tauri::command]
pub fn extract_and_handle_events() -> Result<(), String> {
    let mut log_dir = std::env::temp_dir();
    log_dir.push("suricata_logs");
    let mut eve_path = log_dir.clone();
    eve_path.push("eve.json");
    let eve_path_str = eve_path.to_str().unwrap();

    let mut alert_path = log_dir.clone();
    alert_path.push("alert.json");
    let alert_path_str = alert_path.to_str().unwrap();

    let mut flow_path = log_dir.clone();
    flow_path.push("flow.json");
    let flow_path_str = flow_path.to_str().unwrap();

    if !std::path::Path::new(alert_path_str).exists() {
        File::create(alert_path_str)
            .map_err(|e| format!("Failed to create alert.json: {}", e))?;
    }
    if !std::path::Path::new(flow_path_str).exists() {
        File::create(flow_path_str)
            .map_err(|e| format!("Failed to create flow.json: {}", e))?;
    }

    let file = File::open(eve_path_str)
        .map_err(|e| format!("Failed to open eve.json: {}", e))?;
    let reader = BufReader::new(file);

    let mut alert_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(alert_path_str)
        .map_err(|e| format!("Failed to open alert.json: {}", e))?;
    let mut flow_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(flow_path_str)
        .map_err(|e| format!("Failed to open flow.json: {}", e))?;

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if let Ok(json) = serde_json::from_str::<Value>(&line) {
            match json.get("event_type").and_then(|v| v.as_str()) {
                Some("alert") => {
                    writeln!(alert_file, "{}", line).map_err(|e| format!("Failed to write: {}", e))?;
                }
                Some("flow") => {
                    writeln!(flow_file, "{}", line).map_err(|e| format!("Failed to write: {}", e))?;
                }
                _ => {}
            }        }
    }

    OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(eve_path_str)
        .map_err(|e| format!("Failed to truncate eve.json: {}", e))?;

    Ok(())
}

pub fn read_flow_events() -> Result<Vec<FlowEvent>, String> {
    let mut log_dir = std::env::temp_dir();
    log_dir.push("suricata_logs");
    let mut flow_path = log_dir.clone();
    flow_path.push("flow.json");
    let flow_path_str = flow_path.to_str().unwrap();

    let file = File::open(flow_path_str)
        .map_err(|e| format!("Failed to open {}: {}", flow_path_str, e))?;
    let reader = BufReader::new(file);
    let mut flow_events = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read line: {}", e))?;
        if let Ok(json) = serde_json::from_str::<Value>(&line) {
            if json.get("event_type").and_then(|v| v.as_str()) == Some("flow") {
                let flow = json.get("flow").unwrap_or(&Value::Null);
                let flow_event = FlowEvent {
                    sourceip: json.get("src_ip").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    destinationip: json.get("dest_ip").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    sourceport: json.get("src_port").and_then(|v| v.as_u64()).unwrap_or(0) as u16,
                    destinationport: json.get("dest_port").and_then(|v| v.as_u64()).unwrap_or(0) as u16,
                    protocol: json.get("proto").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    bytes_in: flow.get("bytes_toserver").and_then(|v| v.as_u64()).unwrap_or(0),
                    bytes_out: flow.get("bytes_toclient").and_then(|v| v.as_u64()).unwrap_or(0),
                    packets_in: flow.get("pkts_toserver").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                    packets_out: flow.get("pkts_toclient").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                    start_time: flow.get("start").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    end_time: flow.get("end").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                };
                flow_events.push(flow_event);
            }
        }
    }

    Ok(flow_events)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlowEvent {
    pub sourceip: String,
    pub destinationip: String,
    pub sourceport: u16,
    pub destinationport: u16,
    pub protocol: String,
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub packets_in: u32,
    pub packets_out: u32,    pub start_time: String,
    pub end_time: String,
}