use std::env;
use std::fs::{OpenOptions, File};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio, Child};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::thread;
use std::time::Duration;
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

/// Reads Suricata's eve.json output in real time and processes each event.
fn process_suricata_events<F>(eve_path: &str, mut callback: F) -> std::io::Result<()>
where
    F: FnMut(&Value),
{
    // Wait for the file to be created
    while !std::path::Path::new(eve_path).exists() {
        thread::sleep(Duration::from_secs(1));
    }
    let file = OpenOptions::new().read(true).open(eve_path)?;
    let reader = BufReader::new(file);

    for line in reader.lines() {
        let line = line?;
        if let Ok(json) = serde_json::from_str::<Value>(&line) {
            // Process the Suricata event here
            println!("Processing event: {}", line);
            callback(&json);
        }
    }
    Ok(())
}

fn pick_internet_interface() -> Option<String> {
    for iface in datalink::interfaces() {
        if !iface.is_loopback() && iface.ips.iter().any(|ip| ip.is_ipv4()) {
            // Try to bind and connect to check connectivity
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

/// Checks if a Suricata process is currently running.
/// Returns true if Suricata is active, false otherwise.
#[tauri::command]
pub fn is_suricata_active() -> bool {
    let mut sys = System::new_all();
    sys.refresh_processes();
    for _process in sys.processes_by_name("suricata") {
        // Optionally, check for specific arguments or parent process here
        return true;
    }
    false
}

#[tauri::command]
pub fn run_suricata() -> Result<(), String> {
    let interface = match pick_internet_interface() {
        Some(i) => i,
        None => {
            eprintln!("No suitable network interface found!");
            return Ok(());
        }
    };

    if is_suricata_active() {
        eprintln!("Suricata is already running!");
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

    println!("Using interface: {}", interface);
    println!("Using config: {}", config_path_str);
    println!("Using log directory: {}", log_dir_str);

    std::fs::create_dir_all(log_dir_str)
        .map_err(|e| format!("Failed to create log dir: {}", e))?;
    let suricata_child = start_suricata(&interface, config_path_str, log_dir_str)
        .map_err(|e| format!("Failed to start Suricata: {}", e))?;
    
    println!("Suricata started with PID: {}", suricata_child.id());

    Ok(())
}

#[tauri::command]
pub fn kill_suricata() {
    let mut sys = System::new_all();
    sys.refresh_processes();
    let mut killed_any = false;
    for process in sys.processes_by_name("suricata") {
        println!("Killing Suricata process with PID: {}", process.pid());
        // Try to kill the process
        #[cfg(unix)]
        {
            process.kill_with(Signal::Term);
        }
        #[cfg(windows)]
        {
            process.kill();
        }
        killed_any = true;
    }
    if !killed_any {
        println!("No Suricata process found to kill.");
    }
}

#[derive(Debug, Serialize, Deserialize)]
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
pub fn read_alert_events_from_eve() -> Result<Vec<AlertEvent>, String> {
    let mut log_dir = env::temp_dir();
    log_dir.push("suricata_logs");
    let mut eve_path = log_dir.clone();
    eve_path.push("eve.json");
    let eve_path_str = eve_path.to_str().unwrap();

    let file = File::open(eve_path_str)
        .map_err(|e| format!("Failed to open eve.json: {}", e))?;
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

// Note to self: directory might not work on other os / on deployment
// the home network address is not dynamic, (set to 192.168.0.0/24)
// tbh there should be a way to change configurations but it seems to take alot of time
/* suricata -c "C:\Users\Yi Loon\OneDrive\Documents\GitHub\Heart_Attack\hackattack2025\src-tauri\src\network_traffic_analysis\packet_analysis\suricata.yaml" -i "\Device\NPF_{493F5479-E7C9-4330-A2F8-4C64C439CB71}" -l "C:\Users\Yi Loon\OneDrive\Documents\TestLogs" */