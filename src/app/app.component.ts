// src/app/app.component.ts (Updated parts)
import { Component, inject, ChangeDetectionStrategy,ApplicationRef, ViewChild, OnDestroy, OnInit, Inject } from '@angular/core';
import { Router, RouterOutlet,RouterModule  } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSpinner } from '@angular/material/progress-spinner';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'; // Keep if needed for gap
import { Observable, Subject, Subscription } from 'rxjs';
import { map, shareReplay, take, takeUntil } from 'rxjs/operators'; // Keep if needed for gap
import { TranslateModule } from '@ngx-translate/core'; // Keep for pipes in sidenav
import { MatToolbarModule } from '@angular/material/toolbar';
// Import the new header component
import { HeaderComponent } from './shared/components/layout/header/header.component';
import { LanguageService } from './core/services/language.service';
import { IUserResponse } from './models/auth';
import { AuthService } from './core/services/auth.service';
import { APIService } from './core/services/api.service';
// Services might not be needed here anymore unless used elsewhere in AppComponent
// import { ThemeService } from './core/services/theme.service';
// import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    AsyncPipe,
    NgIf,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatSpinner,
    TranslateModule, // Keep for pipes in this template
    HeaderComponent,
    RouterModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  private breakpointObserver = inject(BreakpointObserver); // Keep for gap
 
  private destroy$ = new Subject<void>(); // Keep for handset observable
 
  private router = inject(Router);
 
  private langChangeSub: Subscription | undefined;
  
  languageService = inject(LanguageService);

  apiServer = inject(APIService);

  accountId:string ='';



  // --- Keep isHandset$ if needed for sidenav gap calculation ---
  isHandset$ = this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
    .pipe(
      map(result => result.matches),
      shareReplay(1),
      takeUntil(this.destroy$)
    );

  // Sidenav state remains here
  sidenavMode$ = this.isHandset$.pipe( map(isHandset => (isHandset ? 'over' : 'side')), takeUntil(this.destroy$));
  sidenavOpened$ = this.isHandset$.pipe( map(isHandset => !isHandset), takeUntil(this.destroy$) );



  constructor(
  ){
   
  }

  ngOnInit(): void {
     
      this.languageService.direction$.pipe(takeUntil(this.destroy$)).subscribe();

  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }


  // --- Keep the method to toggle the sidenav ---
  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }

  // --- Keep the method for link clicks ---
  handleSidenavLinkClick(): void {
    this.closeSidenavOnMobile();
  }

  private closeSidenavOnMobile(): void {
    this.isHandset$.pipe(take(1)).subscribe(isHandset => {
      if (isHandset && this.sidenav) {
        this.sidenav.close();
      }
    });
  }
}