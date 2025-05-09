import { Injectable, inject, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common'; // Inject Document for creating input element

// Define a new interface for the return type suitable for web
export interface SelectedImage {
  file: File;          // The actual File object (contains blob data, name, type, etc.)
  previewUrl: string;  // A temporary URL (usually blob URL) for previewing
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService implements OnDestroy {

  // Inject DOCUMENT to safely create DOM elements
  private document = inject(DOCUMENT);

  // Keep track of generated blob URLs to revoke them later
  private objectUrls: string[] = [];

  constructor() {
    console.log('Web PhotoService Initialized');
  }

  /**
   * Opens a file input dialog for the user to select an image from their device.
   * @param accept - Optional file types to accept (e.g., 'image/png, image/jpeg'). Defaults to 'image/*'.
   * @returns A Promise resolving with the selected image data or undefined if cancelled.
   */
  public selectImageFromGallery(accept: string = 'image/*'): Promise<SelectedImage | undefined> {
    return new Promise((resolve, reject) => {
      // Create a temporary input element
      const input = this.document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none'; // Hide the actual input

      // --- Event Listener ---
      const handleChange = (event: Event) => {
        const element = event.target as HTMLInputElement;
        if (element.files && element.files.length > 0) {
          const file = element.files[0];
          // Validate if it's an image (optional, but good practice)
          if (!file.type.startsWith('image/')) {
            console.error('Selected file is not an image:', file.type);
            // Clean up and reject or resolve with undefined
            cleanup();
            reject(new Error('Selected file is not an image.')); // Or resolve(undefined)
            return;
          }

          const previewUrl = URL.createObjectURL(file);
          this.objectUrls.push(previewUrl); // Store for later cleanup

          const selectedImage: SelectedImage = {
            file: file,
            previewUrl: previewUrl,
          };
          cleanup();
          resolve(selectedImage);
        } else {
          // No file selected (shouldn't happen with change event, but belt-and-suspenders)
          cleanup();
          resolve(undefined); // Resolve with undefined if no file
        }
      };

      // --- Handle Cancellation (important!) ---
      // Browsers don't have a reliable "cancel" event for file input.
      // A common workaround is to check visibilitychange or focus change.
      const handleCancel = () => {
        // Check if a file was selected *before* the window lost/regained focus
        // Need a small delay because change event might fire slightly after focus change
        setTimeout(() => {
           if (!input.files || input.files.length === 0) {
              console.log('File selection likely cancelled.');
              cleanup();
              resolve(undefined); // Resolve as undefined on cancellation
           }
        }, 300); // Adjust delay if needed
      };

      // --- Cleanup function ---
      const cleanup = () => {
        input.removeEventListener('change', handleChange);
        this.document.defaultView?.removeEventListener('focus', handleCancel); // Use defaultView
        this.document.body.removeChild(input);
      };

      // --- Attach listeners and trigger ---
      input.addEventListener('change', handleChange);
      this.document.defaultView?.addEventListener('focus', handleCancel, { once: true }); // Listen for focus regain
      this.document.body.appendChild(input);
      input.click(); // Programmatically click the hidden input
    });
  }

  /**
   * Accesses the device camera using Web APIs (getUserMedia).
   * NOTE: This is more complex, requires HTTPS, user permissions, and UI elements
   * (like a <video> feed and a capture button) which are typically handled
   * within a dedicated component or modal, not just this service.
   * This implementation provides a basic structure but would need a UI component.
   *
   * @returns A Promise resolving with the captured image data or undefined if error/cancelled.
   */
  public async captureImageFromCamera(): Promise<SelectedImage | undefined> {
    // Check for browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Browser API navigator.mediaDevices.getUserMedia not available');
      alert('Camera access is not supported by your browser.'); // User feedback
      return undefined;
    }

    try {
      // 1. Get media stream (requests permission)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      // 2. **THIS IS WHERE A UI COMPONENT IS NEEDED**
      //    - Create a <video> element, set its srcObject = stream, play().
      //    - Create a <canvas> element.
      //    - Add a "Capture" button.
      //    - When Capture is clicked:
      //      - Get video dimensions.
      //      - Set canvas dimensions.
      //      - Draw the current video frame onto the canvas:
      //        canvas.getContext('2d')?.drawImage(videoElement, 0, 0, width, height);
      //      - Stop the stream tracks: stream.getTracks().forEach(track => track.stop());
      //      - Convert canvas to a Blob: await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9)); // Quality 0.9
      //      - If blob exists, create File and resolve.

      // --- Placeholder Implementation (replace with actual UI interaction) ---
      console.warn('Camera capture needs a UI component (video feed, canvas, capture button). Returning placeholder.');
      // Simulate capture after short delay (REMOVE THIS IN REAL IMPLEMENTATION)
      await new Promise(res => setTimeout(res, 1000));
      // Create a dummy blob/file for demonstration (REMOVE THIS)
      const dummyBlob = new Blob(["dummy"], { type: 'image/jpeg' });
      const dummyFile = new File([dummyBlob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(dummyFile);
      this.objectUrls.push(previewUrl);
      stream.getTracks().forEach(track => track.stop()); // Stop stream even for dummy
      return { file: dummyFile, previewUrl };
      // --- End Placeholder ---

    } catch (err: any) {
      console.error('Error accessing camera:', err);
      let userMessage = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMessage = 'Camera permission was denied. Please enable it in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
         userMessage = 'No camera found on this device.';
      }
      alert(userMessage); // Provide feedback
      return undefined;
    }
  }

  /**
   * Helper to get the Blob directly from a SelectedImage.
   * Since SelectedImage.file *is* a File (which inherits from Blob),
   * this is often not needed, but provided for consistency if required.
   * @param image - The SelectedImage object.
   * @returns The Blob object (same as image.file).
   */
  public getBlob(image: SelectedImage): Blob {
    return image.file;
  }

  /**
   * Converts a Blob (or File) to a Base64 encoded string.
   * @param blob - The Blob or File object.
   * @returns A Promise resolving with the Base64 data URL string.
   */
  public convertBlobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
          resolve(reader.result); // result is the data URL (e.g., 'data:image/jpeg;base64,...')
      };
      reader.readAsDataURL(blob);
    });
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    this.revokeObjectUrls(); // Clean up any created URLs when service is destroyed
  }

  /**
  * Revokes previously created object URLs to free up memory.
  * Call this when the preview is no longer needed (e.g., in ngOnDestroy of the component using the preview).
  * The service calls it on its own destruction as a safeguard.
  */
  public revokeObjectUrls(): void {
    this.objectUrls.forEach(url => URL.revokeObjectURL(url));
    this.objectUrls = []; // Clear the array
    console.log('Revoked object URLs');
  }
}