import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard'; // Import the guard

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/pages/users/login/login.component').then(m => m.LoginComponent)
    // Optional: Add a guard to prevent logged-in users from accessing login page
    // canActivate: [loginPageGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./components/pages/users/register/register.component').then(m => m.RegisterComponent)
    // Optional: Add a guard to prevent logged-in users from accessing login page
    // canActivate: [loginPageGuard]
  }
  ,
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/pages/users/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
    // Optional: Add a guard to prevent logged-in users from accessing login page
    // canActivate: [loginPageGuard]
  } ,
  {
    path: 'verfiy-otp/:identifier',
    loadComponent: () => import('./components/pages/users/verify-otp/verify-otp.component').then( m => m.VerifyOtpComponent)
  },

  {
    path: 'verfiy-reset-password-otp/:identifier',
    loadComponent: () => import('./components/pages/users/verify-reset-password/verify-reset-password.component').then( m => m.VerifyResetPasswordComponent)
  },
  {
    path: 'reset-password/:id',
    loadComponent: () => import('./components/pages/users/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
    // Optional: Add a guard to prevent logged-in users from accessing login page
    // canActivate: [loginPageGuard]
  },
  {
    path: 'user-profile/:id', // Example protected route
    loadComponent: () => import('./components/pages/users/user-profile-page/user-profile-page.component').then(m => m.UserProfilePage),
    canActivate: [authGuard] // Apply the guard here
  },
  {
    path: 'dashboard', // Example protected route
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard] // Apply the guard here
  },
  {
    path: 'settings', // Another protected route
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard] // Apply the guard here
  },
  {
    path: 'companies', // URL path
    loadComponent: () => import('./features/company/company-list/company-list.component')
                         .then(m => m.CompanyListComponent), canActivate:[authGuard],
    title: 'Manage Companies' // Optional: Set page title
  },
  {
    path: 'departments', // URL path
    loadComponent: () => import('./features/department/department-tree/department-tree.component')
                         .then(m => m.DepartmentTreeComponent), canActivate:[authGuard],
    title: 'Manage Departments' // Optional: Set page title
  },
  {
    path: 'financial-account', // URL path
    loadComponent: () => import('./features/financial-account/financial-account-manager/financial-account-manager.component')
                         .then(m => m.FinancialAccountManagerComponent), canActivate:[authGuard],
    title: 'Manage Departments' // Optional: Set page title
  },
  // Default route: Redirect to dashboard if logged in, otherwise to login
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/dashboard' // Or set up a check like in the guard
  },
  // Wildcard route (optional)
  {
    path: '**',
    redirectTo: '/dashboard' // Or a dedicated 404 page
  }
];