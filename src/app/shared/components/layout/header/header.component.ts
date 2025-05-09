import { Component, inject, Output, EventEmitter, ChangeDetectionStrategy, OnDestroy, signal, WritableSignal, OnInit } from '@angular/core';
import {  CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { catchError, finalize, map, shareReplay, take, takeUntil, tap } from 'rxjs/operators';

import { LanguageService, Language } from '../../../../core/services/language.service'; 

import {  MatTooltipModule } from '@angular/material/tooltip';

import {  MatToolbarModule } from '@angular/material/toolbar';

import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // Import slide toggle
import { MatIconModule } from '@angular/material/icon'; // Import icon module
import { ThemeService } from '../../../../core/services/theme.service'; // Import ThemeService
import { AuthService } from '../../../../core/services/auth.service';
import { IUserResponse } from '../../../../models/auth';
import { APIService } from '../../../../core/services/api.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { MatDivider } from '@angular/material/divider';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, // Add RouterModule
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule, // Add MatMenuModule
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatDivider,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnDestroy , OnInit {


  @Output() sidenavToggle = new EventEmitter<void>();

  //------- Theme is Dark -----
  isDarkMode: boolean | undefined; 
  // --- Injected Services ---
  themeService = inject(ThemeService);
  languageService = inject(LanguageService);
  translateService = inject(TranslateService); // Needed for pipe
  authService = inject(AuthService);
   apiServer = inject(APIService);
  private breakpointObserver = inject(BreakpointObserver);
  private destroy$ = new Subject<void>();


  // --- User State ---
  currentUser: WritableSignal<IUserResponse | null> = signal(null); // Use signal for user state
  userAvatarUrl: WritableSignal<string | null> = signal(null);
  isLoadingUser: WritableSignal<boolean> = signal(false);

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {

    
   

      this.authService.getUserObservable
            .pipe( takeUntil(this.destroy$),
            tap(user => {
              this.currentUser.set(user);
              // Construct avatar URL (handle missing avatar)
              this.userAvatarUrl.set(
                user?.user_avatar ? `${this.apiServer.getResourcePath(user.user_avatar || '')}` : null // Adjust API host logic
              );
              // console.log('Current user:', user);
            }),
            catchError(err => {
              console.error("Error loading user:", err);
              this.currentUser.set(null); // Ensure user is null on error
              this.userAvatarUrl.set(null);
              return []; // Return empty observable to complete the stream gracefully
            }),
            finalize(() => this.isLoadingUser.set(false))
          )
          .subscribe();
   
  }

  logout(){
    this.authService.logout().then(()=>{
      window.location.reload();
    });
  }

  // --- Responsive State ---
  isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
    .pipe(
      map(result => result.matches),
      shareReplay(1), // Cache the last value
      takeUntil(this.destroy$) // Unsubscribe on destroy
    );

  // --- Language State ---
  currentLang = this.languageService.currentLanguage; // Get signal
  availableLangs = this.languageService.getLanguages();

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

    // --- Event Handlers ---
    onToggleSidenav(): void {
      this.sidenavToggle.emit(); // Emit event to parent
    }
  
    onChangeLanguage(langCode: string): void {
      this.languageService.setLanguage(langCode);
    }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.isDarkMode = this.themeService.isDarkMode();
  }

// --- Fallback Image Handling ---
get fallbackAvatar(): string {
  return 'assets/images/default-avatar.webp'; // Path to your default avatar
}

handleAvatarError(event: Event): void {
   console.warn(`Error loading user avatar. Using fallback.`);
   const target = event.target as HTMLImageElement;
   target.src = this.fallbackAvatar;
   this.userAvatarUrl.set(null); // Set state to null if image fails
}

}