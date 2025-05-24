// // Notification utility functions
// import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

// /**
//  * Sends a system notification if permissions are granted
//  * @param title The notification title
//  * @param body The notification body text
//  */
// export async function showNotification(title: string, body: string): Promise<void> {
//   try {
//     // Check if we have permission
//     let permissionGranted = await isPermissionGranted();
    
//     // Request permission if not already granted
//     if (!permissionGranted) {
//       const permission = await requestPermission();
//       permissionGranted = permission === 'granted';
//     }
    
//     // Send notification if permission is granted
//     if (permissionGranted) {
//       sendNotification({ title, body });
//     } else {
//       console.warn('Notification permission not granted');
//     }
//   } catch (error) {
//     console.error('Failed to show notification:', error);
//   }
// }
