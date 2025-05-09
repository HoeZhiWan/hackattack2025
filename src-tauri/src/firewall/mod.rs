// src/firewall/mod.rs - Main firewall module
mod rules;
mod common;
mod domain_blocking;

// Re-export necessary items from submodules
pub use rules::{get_firewall_rules, add_firewall_rule, remove_firewall_rule, enable_disable_rule};
pub use domain_blocking::{get_blocked_domains, block_domain, unblock_domain};
pub use common::{FirewallState, BlockedDomains};