'use client';

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function TrayHandler() {
  useEffect(() => {
    // Listen for tray events from the Rust backend
    const unlistenTrayEvent = listen('tray-event', async (event) => {
      const action = event.payload as string;
      console.log(`Received tray event: ${action}`);
      
      if (action === 'hide') {
        // The window is already hidden by the Rust code,
        // but we can add any additional frontend handling here
        console.log('Window minimized to tray');
      }
    });

    // Set up additional event listeners for window interactions
    const setupWindowEvents = async () => {
      try {
        const appWindow = getCurrentWindow();
        
        // Listen for window minimize events
        const unlistenMinimize = await appWindow.onResized(({ payload: size }) => {
          console.log('Window resized', size);
        });
        
        // Listen for window focus changes
        const unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
          console.log('Focus changed, window is focused?', focused);
        });
        
        // Listen for window close requested events
        const unlistenCloseRequested = await appWindow.onCloseRequested(async (event) => {
          console.log('Window close requested');
          // You can prevent default behavior by uncommenting the line below
          // event.preventDefault();
        });
        
        // Return cleanup function for window events
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
    });

    // Clean up all event listeners when the component unmounts
    return () => {
      unlistenTrayEvent.then(unlistenFn => unlistenFn());
      if (windowEventsCleanup) windowEventsCleanup();
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}