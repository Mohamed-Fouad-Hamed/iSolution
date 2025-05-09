import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, Optional, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'; // Import Material Dialog types
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // For loading indicators
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // For error feedback
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // Optional for messages
import { Subject } from 'rxjs';

// Adjust path as needed
import { PhotoService } from '../../../core/services/PhotoService'; // Assuming Photo type is exported

// Optional data structure for passing data TO the dialog (if needed)
export interface SelectImageData {
    initialPrompt?: string; // Example data
}

@Component({
  selector: 'app-select-image',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './select-image.component.html',
  styleUrls: ['./select-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Use OnPush
})
export class SelectImageComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElementRef: ElementRef<HTMLVideoElement> | undefined;

  // --- Injected Dependencies ---
  private dialogRef = inject(MatDialogRef<SelectImageComponent>);
  private cdRef = inject(ChangeDetectorRef);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private photoService = inject(PhotoService);
  private zone = inject(NgZone);

  // --- State ---
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  isLoading = false;
  isCameraActive = false;
  isCameraFeedVisible = false; // <-- NEW STATE: Controls direct visibility of feed
  private currentStream: MediaStream | null = null;

  private destroy$ = new Subject<void>();

  // --- Lifecycle ---
  ngOnInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopStreamTracks(); // Ensure tracks are stopped
    if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  // --- Gallery Selection ---
  async selectImageFromGallery(): Promise<void> {
    // ... (same as before) ...
     this.isLoading = true;
     this.resetImageInternal(false); // Don't stop stream if it wasn't active
     this.isCameraActive = false; // Ensure camera view is off
     this.isCameraFeedVisible = false;
     this.cdRef.markForCheck();
     try {
       const result = await this.photoService.selectImageFromGallery();
       if (result) {
         this.previewUrl = result.previewUrl;
         this.selectedFile = result.file;
       }
     } catch(error: any) {
        console.error('Error selecting from gallery:', error);
        this.showSnackbar('selectImage.errorLoading', 'error-snackbar');
     } finally {
        this.isLoading = false;
        this.cdRef.markForCheck();
     }
  }

  // --- Camera Activation ---
  async activateCamera(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showSnackbar('selectImage.errorCameraNotSupported', 'error-snackbar');
      return;
    }
    this.isLoading = true;
    this.resetImageInternal(false); // Clear previous preview/file
    this.isCameraActive = true; // Show the camera container
    this.isCameraFeedVisible = false; // Hide video initially
    this.cdRef.markForCheck();

    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.isLoading = false;
      this.isCameraFeedVisible = true; // <-- Show video feed NOW
      this.cdRef.detectChanges(); // Ensure video element is rendered

      if (this.videoElementRef && this.videoElementRef.nativeElement) {
        this.videoElementRef.nativeElement.srcObject = this.currentStream;
        // No need to call play, autoplay attribute should handle it
      } else {
         throw new Error('Video element not found after activating camera.');
      }
    } catch (err: any) {
      // ... (error handling same as before) ...
      this.stopStreamAndResetCameraState(true); // Reset state on error
      this.showSnackbarOnError(err);
    }
  }

  // --- Capture Frame ---
  captureFrame(): void {
    if (!this.isCameraActive || !this.videoElementRef?.nativeElement || !this.currentStream) {
      return;
    }

    const video = this.videoElementRef.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (context) {
       // --- Hide the video element immediately ---
       this.isCameraFeedVisible = false;
       this.isLoading = true; // Show loading spinner instead of video
     //  this.cdRef.markForCheck(); // Update view to hide video, show spinner

       context.drawImage(video, 0, 0, canvas.width, canvas.height);

       // Stop the tracks *after* drawing the frame
       this.stopStreamTracks(); // Releases camera hardware

       canvas.toBlob((blob) => {
         // Run final state updates in NgZone
         this.zone.run(() => { // <-- Start NgZone wrapper

           this.isLoading = false; // Hide spinner

           if (blob) {
             this.selectedFile = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
             // Clean up previous blob URL
             this.revokePreviewUrl();
             this.previewUrl = URL.createObjectURL(this.selectedFile);
             this.isCameraActive = false; // Hide the camera *container* now via *ngIf
             // REMOVED: this.cdRef.markForCheck(); // Let zone.run handle CD
             console.log(`Image captured: ${this.selectedFile.name}`);
           } else {
             console.error('Failed to create blob from canvas.');
             this.showSnackbar('selectImage.errorProcessing', 'error-snackbar');
             this.resetImageInternal(false); // Reset preview/file state
             this.isCameraActive = false; // Hide camera container on error too
             // REMOVED: this.cdRef.markForCheck(); // Let zone.run handle CD
           }
           this.cdRef.markForCheck();
         }); // <-- End NgZone wrapper
       }, 'image/jpeg', 0.9);

    } else {
       console.error('Could not get 2D context from canvas.');
       this.showSnackbar('selectImage.errorProcessing', 'error-snackbar');
       // Use the helper that stops stream, resets state, and triggers CD
       this.stopStreamAndResetCameraState(true);
       // Ensure loading is stopped if context fails before blob starts
       this.isLoading = false;
       this.cdRef.markForCheck(); // Need manual trigger here as it's outside zone.run
    }
  }


  // --- Stop Camera and Go Back to Placeholder/Preview ---
  stopCameraStreamAndGoBack(): void {
      this.stopStreamAndResetCameraState(true); // Stop and trigger CD
  }

  // --- Internal Helper to Stop Tracks ---
  private stopStreamTracks(): void {
     if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      console.log('Camera stream tracks stopped.');
      this.currentStream = null;
    }
  }

  // Helper function used in error path above and other places
  private stopStreamAndResetCameraState(triggerChangeDetection: boolean): void {
    this.stopStreamTracks();
    // Use zone run here as well for safety if called from async contexts potentially
    this.zone.run(() => {
        this.isCameraActive = false;
        this.isCameraFeedVisible = false;
        if (triggerChangeDetection) {
            // Potentially still need markForCheck if called synchronously without zone knowing
            this.cdRef.markForCheck();
        }
    });
}

  // --- Image Reset ---
  resetImage(): void {
    this.resetImageInternal(true); // Stop stream if resetting from preview
    this.cdRef.markForCheck();
  }

  private resetImageInternal(shouldStopStream: boolean): void {
    if (shouldStopStream) {
        this.stopStreamAndResetCameraState(false); // Stop stream but defer CD
    }
    this.revokePreviewUrl();
    this.previewUrl = null;
    this.selectedFile = null;
  }

  private revokePreviewUrl(): void {
     if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  // --- Dialog Actions ---
  cancel(): void {
    this.stopStreamAndResetCameraState(false); // Stop stream before closing
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.selectedFile) {
      this.stopStreamAndResetCameraState(false); // Stop stream before closing
      this.dialogRef.close({ imageData: this.selectedFile });
    } else {
      this.showSnackbar('selectImage.errorNoImageSelected', 'warn-snackbar');
    }
  }

  // --- Utility ---
  private showSnackbar(messageKey: string, panelClass: string = ''): void {
      this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), {
        duration: 3000,
        panelClass: [panelClass],
        verticalPosition: 'bottom'
      });
  }

  private showSnackbarOnError(err: any): void {
      let messageKey = 'selectImage.errorCameraGeneric';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        messageKey = 'selectImage.errorCameraPermission';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
         messageKey = 'selectImage.errorCameraNotFound';
      }
      this.showSnackbar(messageKey, 'error-snackbar');
  }

}
