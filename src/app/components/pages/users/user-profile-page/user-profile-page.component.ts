import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // Import MatDialog
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list'; // For displaying user info
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // Assuming translation setup
import { Subject } from 'rxjs';
import { finalize, takeUntil, catchError, tap, take } from 'rxjs/operators';

// Adjust paths as needed
import { APIService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { IUserResponse } from '../../../../models/auth'; // Adjust path
import { SelectImageComponent } from '../../../utilities/select-image/select-image.component'; // Adjust path

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatListModule,
    TranslateModule
  ],
  templateUrl: './user-profile-page.component.html',
  styleUrls: ['./user-profile-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush // Use OnPush
})
export class UserProfilePage implements OnInit, OnDestroy {

  // --- Injected Dependencies ---
  private route = inject(ActivatedRoute);
  private apiService = inject(APIService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog); // Use MatDialog
  private snackBar = inject(MatSnackBar);
  private cdRef = inject(ChangeDetectorRef); // Inject ChangeDetectorRef
  private translate = inject(TranslateService); // Optional for snackbars

  // --- State ---
  login: string | null = null; // Initialize as null
  currentUser: IUserResponse | null = null; // Initialize as null
  avatarUrl: string | null = null; // Use null for clearer initial state
  imageUrl: string | null = null; // Use null for clearer initial state
  isLoadingUser = true; // Loading indicator for initial user fetch
  isUploadingAvatar = false;
  isUploadingImage = false;

  private destroy$ = new Subject<void>(); // For unsubscribing

  // --- Lifecycle Hooks ---
  ngOnInit(): void {
    // Get login from route params reactively (safer if component might be reused)
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.login = params.get('id');
        if (this.login) {
          this.loadUserProfile(this.login);
        } else {
          console.error('User login (id) missing from route parameters.');
          this.showSnackbar('userProfile.errorMissingId', 'error-snackbar');
          this.isLoadingUser = false;
          this.cdRef.markForCheck(); // Update view even on error
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // --- Data Loading ---
  private loadUserProfile(loginId: string): void {
    this.isLoadingUser = true;
    this.currentUser = null; // Reset while loading
    this.avatarUrl = null;
    this.imageUrl = null;
    this.cdRef.markForCheck(); // Update view for loading state

    this.authService.getUserObservable
      .pipe(
        take(1), // Take only one emission
        tap(user  => {
        
            this.currentUser = user || null;
            this.avatarUrl = user?.user_avatar ? `${this.apiService.apiHost}${user?.user_avatar}` : null; // Handle potentially empty paths
            this.imageUrl = user?.user_image ? `${this.apiService.apiHost}${user?.user_image}` : null;
          
        }),
        catchError(err => {
          console.error('Error fetching user profile:', err);
          this.showSnackbar('userProfile.errorLoading', 'error-snackbar');
          this.currentUser = null; // Ensure null on error
          // Rethrow or return an empty observable if needed downstream
          return []; // Completes the stream without emitting user data
        }),
        finalize(() => {
          this.isLoadingUser = false;
          this.cdRef.markForCheck(); // Update view after loading finishes
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  // --- Image Upload Trigger ---
  openImageUploadDialog(uploadType: 'avatar' | 'image'): void {
    if (!this.login) return; // Should not happen if init logic is correct

    const dialogRef = this.dialog.open(SelectImageComponent, {
      width: 'clamp(320px, 90vw, 550px)', // Responsive width: min 320px, 90% of viewport, max 550px
      maxWidth: '95vw', // Safety margin
    
      height: 'auto', // Let content determine height initially
      maxHeight: '85vh', // Limit maximum height relative to viewport
    });

    dialogRef.afterClosed()
      .pipe(take(1)) // Only handle the close event once
      .subscribe(result => {
        if (result && result.imageData && this.login) { // Check if data was returned
          this.uploadImage(uploadType, result.imageData, this.login);
        }
      });
  }

  // --- Image Upload Logic ---
  private uploadImage(uploadType: 'avatar' | 'image', imageData: File, loginId: string): void {
    const formData: FormData = new FormData();
    // Ensure file type is reasonably determined
    const extension = imageData.name.split('.').pop() || imageData.type.split('/')[1] || 'jpg';
    const fileName = `${uploadType}-user-${Date.now()}.${extension}`; // Use timestamp for uniqueness

    formData.append(uploadType, imageData, fileName); // 'avatar' or 'image' as key
    formData.append('id', loginId);

    // Set loading state
    if (uploadType === 'avatar') this.isUploadingAvatar = true;
    else this.isUploadingImage = true;
    this.cdRef.markForCheck();

    const uploadObservable = uploadType === 'avatar'
      ? this.authService.userUploadAvatar(formData)
      : this.authService.userUploadImage(formData);

    uploadObservable
      .pipe(
        take(1),
        tap({
          next: (res) => {
            console.log(`${uploadType} upload response:`, res);
            // Assuming the response contains the updated user or at least the new image path
            // Option 1: Response has full updated user
             if (res?.entity) { // Adjust based on your API response structure
               this.currentUser = res.entity;
               this.avatarUrl = this.currentUser?.user_avatar ? `${this.apiService.apiHost}${this.currentUser.user_avatar}` : null;
               this.imageUrl = this.currentUser?.user_image ? `${this.apiService.apiHost}${this.currentUser.user_image}` : null;
             }
            // Option 2: Response only has the new path (less ideal)
            // else if (res?.newPath) {
            //    if (uploadType === 'avatar') this.avatarUrl = `${this.apiService.apiHost}${res.newPath}`;
            //    else this.imageUrl = `${this.apiService.apiHost}${res.newPath}`;
            //    // Potentially mark currentUser as stale if needed
            // }
            else {
                 // Fallback or specific handling if response structure is different
                 this.showSnackbar(`userProfile.success${uploadType === 'avatar' ? 'Avatar' : 'Image'} Upload`, 'success-snackbar');
                 // You might need to reload the user profile if the response isn't sufficient
                 // this.loadUserProfile(loginId);
            }
          },
          error: (err) => {
            console.error(`Error uploading ${uploadType}:`, err);
            this.showSnackbar(`userProfile.error${uploadType === 'avatar' ? 'Avatar' : 'Image'}Upload`, 'error-snackbar');
          }
        }),
        finalize(() => {
          if (uploadType === 'avatar') this.isUploadingAvatar = false;
          else this.isUploadingImage = false;
          this.cdRef.markForCheck(); // Update view after upload finishes
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  // --- Utility ---
  private showSnackbar(messageKey: string, panelClass: string = ''): void {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), {
      duration: 3000,
      panelClass: [panelClass],
      verticalPosition: 'top'
    });
  }

  // --- Default Image Handling ---
  get fallbackAvatar(): string {
    // Provide path to a default avatar image
    return 'assets/images/default-avatar.webp';
  }

  get fallbackImage(): string {
    // Provide path to a default background image or a placeholder color/gradient
    return 'assets/images/default-background.webp';
  }

  handleImageError(event: Event, type: 'avatar' | 'image'): void {
     console.warn(`Error loading ${type} image. Using fallback.`);
     const target = event.target as HTMLImageElement;
     target.src = type === 'avatar' ? this.fallbackAvatar : this.fallbackImage;
     // Optionally clear the URL in the state if the fetched URL is invalid
     // if (type === 'avatar') this.avatarUrl = null;
     // else this.imageUrl = null;
     // this.cdRef.markForCheck();
  }
}
