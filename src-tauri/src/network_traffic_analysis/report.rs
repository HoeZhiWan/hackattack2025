use std::collections::HashMap;
use std::fs::File;
use std::net::Ipv6Addr;
use serde::{Serialize, Deserialize};
use crate::network_traffic_analysis::suricata::{read_flow_events};

#[derive(Serialize, Deserialize)]
struct TopEntry {
    name: String,
    frequency: u64,
}

#[derive(Serialize, Deserialize)]
pub struct FlowReport {
    time_start: String,
    time_end: String,
    flow_count: usize,
    top_sourceip: Vec<TopEntry>,
    top_destinationip: Vec<TopEntry>,
    top_sourceport: Vec<TopEntry>,
    top_destinationport: Vec<TopEntry>,
    protocol: Vec<TopEntry>,
}

#[tauri::command]
pub fn generate_flow_report() -> Result<(), String> {
    let flow_events = read_flow_events()?;    if flow_events.is_empty() {
        return Err("No flow events found.".to_string());
    }

    let mut src_ip_freq: HashMap<String, u64> = HashMap::new();
    let mut dst_ip_freq: HashMap<String, u64> = HashMap::new();
    let mut src_port_freq: HashMap<u16, u64> = HashMap::new();
    let mut dst_port_freq: HashMap<u16, u64> = HashMap::new();
    let mut proto_freq: HashMap<String, u64> = HashMap::new();

    let mut first_start_time = None;
    let mut last_end_time = None;

    for (i, event) in flow_events.iter().enumerate() {        *src_ip_freq.entry(event.sourceip.clone()).or_insert(0) += 1;
        *dst_ip_freq.entry(event.destinationip.clone()).or_insert(0) += 1;
        *src_port_freq.entry(event.sourceport).or_insert(0) += 1;
        *dst_port_freq.entry(event.destinationport).or_insert(0) += 1;
        *proto_freq.entry(event.protocol.clone()).or_insert(0) += 1;

        if i == 0 {
            first_start_time = Some(event.end_time.clone());        }
        last_end_time = Some(event.start_time.clone());
    }

    fn top_n<T: Clone + Eq + std::hash::Hash + ToString>(freq: &HashMap<T, u64>, n: usize) -> Vec<TopEntry> {
        let mut v: Vec<_> = freq.iter().collect();
        v.sort_by(|a, b| b.1.cmp(a.1));
        v.iter().take(n).map(|(k, v)| TopEntry { name: k.to_string(), frequency: **v }).collect()
    }

    fn all_proto(freq: &HashMap<String, u64>) -> Vec<TopEntry> {
        let mut v: Vec<_> = freq.iter().collect();
        v.sort_by(|a, b| b.1.cmp(a.1));
        v.iter().map(|(k, v)| TopEntry { name: k.to_string(), frequency: **v }).collect()
    }

    fn normalize_ip(ip: &str) -> String {
        if ip.contains(':') {
            if let Ok(addr) = ip.parse::<Ipv6Addr>() {
                return addr.to_string();
            }
        }
        ip.to_string()
    }

    fn top_n_ip(freq: &HashMap<String, u64>, n: usize) -> Vec<TopEntry> {
        let mut v: Vec<_> = freq.iter().collect();
        v.sort_by(|a, b| b.1.cmp(a.1));
        v.iter()
            .take(n)
            .map(|(k, v)| TopEntry { name: normalize_ip(k), frequency: **v })
            .collect()
    }    fn format_time(s: &str) -> String {
        if s.len() >= 19 {
            let year = &s[0..4];
            let month = &s[5..7];
            let day = &s[8..10];
            let hour = &s[11..13];
            let min = &s[14..16];
            let sec = &s[17..19];
            return format!("{}-{}-{} {}:{}:{}", year, month, day, hour, min, sec);
        }
        s.to_string()
    }

    let time_start = first_start_time.as_ref().map(|s| format_time(s)).unwrap_or_default();
    let time_end = last_end_time.as_ref().map(|s| format_time(s)).unwrap_or_default();

    let flow_count = flow_events.len();

    let report = FlowReport {
        time_start,
        time_end,
        flow_count,
        top_sourceip: top_n_ip(&src_ip_freq, 5),
        top_destinationip: top_n_ip(&dst_ip_freq, 5),
        top_sourceport: top_n(&src_port_freq, 5),
        top_destinationport: top_n(&dst_port_freq, 5),        protocol: all_proto(&proto_freq),
    };

    let mut log_dir = std::env::temp_dir();
    log_dir.push("suricata_logs");
    let mut report_path = log_dir.clone();
    report_path.push("report.json");

    let file = File::create(&report_path)
        .map_err(|e| format!("Failed to create report.json: {}", e))?;
    serde_json::to_writer_pretty(file, &report)
        .map_err(|e| format!("Failed to write report.json: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn read_flow_report() -> Result<FlowReport, String> {
    let mut log_dir = std::env::temp_dir();
    log_dir.push("suricata_logs");
    let mut report_path = log_dir.clone();
    report_path.push("report.json");

    let file = File::open(&report_path)
        .map_err(|e| format!("Failed to open report.json: {}", e))?;
    serde_json::from_reader(file)
        .map_err(|e| format!("Failed to parse report.json: {}", e))
}

