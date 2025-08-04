import { ApplicationConfig, isDevMode , importProvidersFrom ,APP_INITIALIZER  } from '@angular/core';
import { provideRouter } from '@angular/router';
//import { provideClientHydration } from '@angular/platform-browser';
//import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { provideHttpClient,HttpClient , withInterceptors} from '@angular/common/http';

import { authInterceptor } from './core/interceptors/auth.interceptor'; 
import { AuthService } from './core/services/auth.service';
import { Observable } from 'rxjs';
// AoT requires an exported function for factories
export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient, './assets/i18n/', '.json');
}

// Factory function
function initializeAuthFactory(authService: AuthService): () => Observable<boolean> {
  return () => authService.authByTokenFromStorge();
}

export const appConfig: ApplicationConfig = {
  providers: [
              provideRouter(routes), 
             // provideClientHydration(),
              provideAnimationsAsync(),
              // --- Provide HttpClient WITH the interceptor ---
              provideHttpClient(withInterceptors([authInterceptor])), // add interceptor
              
              // --- ngx-translate configuration ---
              importProvidersFrom(TranslateModule.forRoot({
                loader: {
                  provide: TranslateLoader,
                  useFactory: HttpLoaderFactory,
                  deps: [HttpClient],
                },
                defaultLanguage: 'en', // Set default language
              })),
              {
                provide: APP_INITIALIZER,
                useFactory: initializeAuthFactory,
                deps: [AuthService], // Inject AuthService into the factory
                multi: true // Required for APP_INITIALIZER
              },
              provideServiceWorker('ngsw-worker.js', {
              enabled: !isDevMode(),
              registrationStrategy: 'registerWhenStable:30000'
    })]
};
