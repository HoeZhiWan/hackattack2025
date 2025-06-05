"use client";

import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { useNotification } from './NotificationProvider';
import { 
  createPopupAlert, 
  showSecurityAlert, 
  showDomainBlockedAlert, 
  showIntrusionAlert,
  showFirewallAlert,
  AlertType
} from '../../lib/utils/popup-alerts';

const PopupDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customType, setCustomType] = useState<AlertType>('info');
  const { showNotification } = useNotification();

  const handleShowModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleShowNotification = (type: 'info' | 'success' | 'warning' | 'error') => {
    const messages = {
      info: { title: '🛡️ Security Info', message: 'System scan completed successfully.' },
      success: { title: '✅ Domain Blocked', message: 'www.malicious-site.com has been blocked successfully.' },
      warning: { title: '⚠️ Security Warning', message: 'Suspicious activity detected on your network.' },
      error: { title: '❌ Security Alert', message: 'Failed to block domain. Please check your permissions.' }
    };

    const { title, message } = messages[type];
    
    showNotification({
      title,
      message,
      type,
      actions: [
        {
          label: 'View Details',
          onClick: () => {
            console.log('View details clicked');
            setIsModalOpen(true);
          },
          style: 'primary'
        },
        {
          label: 'Dismiss',
          onClick: () => {
            console.log('Dismissed');
          },
          style: 'secondary'
        }
      ]    });
  };

  const handleCustomAlert = async () => {
    if (!customTitle.trim() || !customMessage.trim()) {
      showNotification({
        title: 'Error',
        message: 'Please fill in both title and message',
        type: 'error'
      });
      return;
    }

    await createPopupAlert({
      title: customTitle,
      message: customMessage,
      type: customType
    });
  };

  const demoTauriAlerts = [
    {
      name: 'Security Alert',
      action: () => showSecurityAlert('Suspicious network activity detected on port 443. Connection has been terminated.'),
      color: 'bg-yellow-500',
      icon: '⚠️'
    },
    {
      name: 'Domain Blocked',
      action: () => showDomainBlockedAlert('malicious-site.com'),
      color: 'bg-red-500',
      icon: '🚫'
    },
    {
      name: 'Intrusion Alert',
      action: () => showIntrusionAlert('Multiple failed login attempts from IP 192.168.1.100'),
      color: 'bg-red-600',
      icon: '🚨'
    },
    {
      name: 'Firewall Alert',
      action: () => showFirewallAlert('blocked incoming connection', 'TCP port 22 from 203.0.113.42'),
      color: 'bg-blue-500',
      icon: '🛡️'
    }
  ];
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">🎨 Popup & Notification Demo</h3>
      
      {/* Tauri Popup Windows Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium mb-4 text-purple-800">🖥️ Tauri Popup Windows (Native OS Windows):</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {demoTauriAlerts.map((alert) => (
            <button
              key={alert.name}
              onClick={alert.action}
              className={`${alert.color} hover:opacity-90 text-white font-medium py-3 px-4 rounded-lg transition-opacity flex items-center space-x-2`}
            >
              <span>{alert.icon}</span>
              <span>Show {alert.name}</span>
            </button>
          ))}
        </div>
        
        {/* Custom Tauri Alert Form */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h5 className="font-semibold text-purple-800 mb-3">Create Custom Popup Window</h5>
          
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter alert title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            <div>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter alert message..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            <div className="flex space-x-2">
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as AlertType)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="blocked">Blocked</option>
              </select>
              
              <button
                onClick={handleCustomAlert}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors text-sm"
              >
                Create Popup
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal Demo Buttons */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2 text-blue-800">📱 In-App Modal Examples:</h4>
        <button
          onClick={handleShowModal}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Show Modal Dialog
        </button>
      </div>      {/* Notification Demo Buttons */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2 text-green-800">🔔 In-App Notification Examples:</h4>
        <div className="space-x-2">
          <button
            onClick={() => handleShowNotification('info')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Info
          </button>
          <button
            onClick={() => handleShowNotification('success')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Success
          </button>
          <button
            onClick={() => handleShowNotification('warning')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
          >
            Warning
          </button>
          <button
            onClick={() => handleShowNotification('error')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Error
          </button>        </div>
      </div>

      {/* Information Section */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">📋 Types of Alerts Available:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h5 className="font-semibold text-purple-800 mb-1">🖥️ Tauri Popup Windows:</h5>
            <ul className="space-y-1">
              <li>• Native OS windows (separate from browser)</li>
              <li>• Always on top and centered</li>
              <li>• Can show multiple simultaneously</li>
              <li>• Best for critical security alerts</li>
              <li>• Persist even if main app is minimized</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-blue-800 mb-1">📱 In-App Notifications:</h5>
            <ul className="space-y-1">
              <li>• Overlay notifications within the app</li>
              <li>• Auto-dismiss after timeout</li>
              <li>• Interactive with action buttons</li>
              <li>• Good for status updates</li>
              <li>• Don't interrupt user workflow</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="🛡️ Security Details"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Network Security Status</h4>
            <p className="text-blue-700 text-sm">
              Your network is currently protected with the following security measures:
            </p>
            <ul className="mt-2 text-blue-700 text-sm list-disc list-inside">
              <li>Firewall: Active with 15 rules</li>
              <li>Domain Blocking: 8 domains blocked</li>
              <li>Intrusion Detection: Active</li>
              <li>Real-time Monitoring: Enabled</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Recent Actions</h4>
            <div className="space-y-1 text-green-700 text-sm">
              <p>• Blocked attempt to access malicious-site.com</p>
              <p>• Updated firewall rules for port 443</p>
              <p>• Detected and blocked 3 suspicious connections</p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                handleCloseModal();
                handleShowNotification('success');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Generate Report
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PopupDemo;
