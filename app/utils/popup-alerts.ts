// Popup alert utilities for Tauri
import { invoke } from '@tauri-apps/api/core';

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'blocked';

export interface PopupAlertOptions {
  title: string;
  message: string;
  type?: AlertType;
}

/**
 * Create a popup alert window
 */
export async function createPopupAlert(options: PopupAlertOptions): Promise<void> {
  try {
    await invoke('create_popup_alert', {
      title: options.title,
      message: options.message,
      alertType: options.type || 'info'
    });
  } catch (error) {
    console.error('Failed to create popup alert:', error);
    // Fallback to browser alert
    alert(`${options.title}: ${options.message}`);
  }
}

/**
 * Show a security alert popup
 */
export async function showSecurityAlert(message: string): Promise<void> {
  return createPopupAlert({
    title: '🔒 Security Alert',
    message,
    type: 'warning'
  });
}

/**
 * Show a domain blocked alert popup
 */
export async function showDomainBlockedAlert(domain: string): Promise<void> {
  return createPopupAlert({
    title: '🚫 Domain Blocked',
    message: `Access to "${domain}" has been blocked for your security.\n\nThis domain may contain malicious content or violate your security policies.`,
    type: 'blocked'
  });
}

/**
 * Show an intrusion detection alert popup
 */
export async function showIntrusionAlert(details: string): Promise<void> {
  return createPopupAlert({
    title: '🚨 Intrusion Detected',
    message: `Potential security threat detected:\n\n${details}\n\nPlease review your network activity and take appropriate action.`,
    type: 'error'
  });
}

/**
 * Show a firewall rule alert popup
 */
export async function showFirewallAlert(action: string, rule: string): Promise<void> {
  return createPopupAlert({
    title: '🛡️ Firewall Alert',
    message: `Firewall ${action}: ${rule}\n\nThis action was taken to protect your system.`,
    type: 'info'
  });
}
