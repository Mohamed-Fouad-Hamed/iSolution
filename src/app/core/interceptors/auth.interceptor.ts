import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn // Pass the request to the next handler
  ) => {
    
  const authService = inject(AuthService);
  const authToken = authService.getToken(); // Get token from service

  // --- Configuration: Define URLs that DON'T need the token ---
  const urlsToExclude = [
    '/api/auth/login', // Don't add token to login request itself
    '/api/auth/register' // Or registration etc.
    // Add other public API endpoints if needed
  ];

  // Check if the request URL matches any of the excluded URLs
  const shouldExclude = urlsToExclude.some(url => req.url.includes(url));

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