// src/firewall/mod.rs - Main firewall module
mod rules;
pub mod common;  // Make the module public
pub mod domain_blocking;  // Make the module public


// Re-export necessary items from submodules
pub use rules::{get_firewall_rules, add_firewall_rule, remove_firewall_rule, enable_disable_rule};
pub use domain_blocking::{get_blocked_domains, block_domain, unblock_domain};
pub use common::{FirewallState, BlockedDomains};

