import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn // Pass the request to the next handler
  ) => {
    
  const authService = inject(AuthService);
  const authToken = authService.getToken(); // Get token from service

  // --- Configuration: Define URLs that DON'T need the token ---
  const urlsToExclude = [
    '/login', // Don't add token to login request itself
    '/register',
    './assets/i18n/en.json',
    './assets/i18n/ar.json' // Or registration etc.
    // Add other public API endpoints if needed
  ];


  const isLocalAsset = req.url.includes('assets/i18n');

  // Check if the request URL matches any of the excluded URLs
  const shouldExclude = urlsToExclude.some(url => req.url.endsWith(url)) || isLocalAsset;

  if (authToken && !shouldExclude) {
    // Clone the request and add the authorization header
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}` // Common practice: 'Bearer' prefix
      }
      // Alternative: set specific header name if your API expects something different
      // headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    // console.log('AuthInterceptor: Adding token to request', authReq.url);
    return next(authReq); // Pass the cloned request with header
  } else {
    // If no token or excluded URL, pass the original request without modification
    // console.log('AuthInterceptor: No token or excluded URL, passing original request', req.url);
    return next(req);
  }
};