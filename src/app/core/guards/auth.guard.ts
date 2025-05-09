import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators'; // If using observable-based check

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) { // Check the computed signal
    return true; // User is logged in, allow access
  } else {
    // User is not logged in, redirect to login page
    console.log('AuthGuard: User not logged in, redirecting to /login');
    // Store the attempted URL to redirect back after login (optional)
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false; // Prevent access
  }

  // --- Alternative using Observable (if isLoggedIn was an Observable) ---
  // return authService.isLoggedIn$.pipe( // Assuming isLoggedIn$ is an Observable<boolean>
  //   take(1), // Take the first emission and complete
  //   map(isLoggedIn => {
  //     if (isLoggedIn) {
  //       return true;
  //     } else {
  //       router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  //       return false;
  //     }
  //   })
  // );
};