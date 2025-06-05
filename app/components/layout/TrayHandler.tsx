'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { createPopupAlert } from '../../lib/utils/popup-alerts';

export default function TrayHandler() {  useEffect(() => {
    const unlistenTrayEvent = listen('tray-event', async (event) => {
      const action = event.payload as string;      
      if (action === 'hide') {
      }    });

    const unlistenPopupAlert = listen('create-popup-alert', async (event) => {
      const { title, message, alertType } = event.payload as {
        title: string;
        message: string;
        alertType: string;
      };
      
      try {
        await createPopupAlert({
          title,
          message,
          type: alertType as any        });
      } catch (error) {
      }    });

    const setupWindowEvents = async () => {
      try {
        const appWindow = getCurrentWindow();
        
        const unlistenMinimize = await appWindow.onResized(({ payload: size }) => {
        });
        
        const unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
        });
        
        const unlistenCloseRequested = await appWindow.onCloseRequested(async (event) => {        });
        
        return () => {
          unlistenMinimize();
          unlistenFocus();
          unlistenCloseRequested();
        };
      } catch (error) {
        console.error('Failed to set up window events:', error);
        return () => {};
      }
    };

    // Store cleanup functions
    let windowEventsCleanup: (() => void) | undefined;
    
    // Initialize window events and store cleanup function
    setupWindowEvents().then(cleanup => {
      windowEventsCleanup = cleanup;
    });    // Clean up all event listeners when the component unmounts
    return () => {
      unlistenTrayEvent.then(unlistenFn => unlistenFn());
      unlistenPopupAlert.then(unlistenFn => unlistenFn());
      if (windowEventsCleanup) windowEventsCleanup();
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}