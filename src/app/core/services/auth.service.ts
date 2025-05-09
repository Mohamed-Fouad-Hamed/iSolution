import { Injectable, inject, signal, computed, OnDestroy, booleanAttribute } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, catchError, tap, BehaviorSubject, Subject, delay, timer, switchMap, take, map, of } from 'rxjs';
import { APIService } from './api.service';
import { MessageResponse } from '../../models/MessageResponse';
import { IAccountSignup, ILogin, INewPassword, ISignup, ITokenLogin, IUniqueLogin, IUserResponse, IVerifyOTP } from '../../models/auth';

export interface AuthResponse {
  token: string;
  // Add other user details if your API returns them
  // userId?: string;
  // roles?: string[];
}

const TOKEN_KEY = 'auth_token'; // Key for localStorage
const ACCOUNTID_KEY = 'auth_account_id'; // Key for localStorage

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy{
  private http = inject(HttpClient);
  private API = inject(APIService);
  // Adjust if your API base URL is different

  // Signal to hold the current token (null if not logged in)
  // Initialize by attempting to load from storage
  currentUserToken = signal<string | null>(this.getTokenFromStorage());

  currentAccountId = signal<string | null>(this.getAccountIdFromStorage());

  // Computed signal: true if a token exists, false otherwise
  isLoggedIn = computed(() => !!this.currentUserToken());
  
   private userInfo = new BehaviorSubject<IUserResponse | null>(null);
  
   private userObservable$:Observable<IUserResponse | null> = this.userInfo.asObservable();
  
   private _isAuthenticate: boolean = false;
  
     setAuthentication( auth:boolean ){
      this._isAuthenticate = auth;
     }
  
     get getAuthenticate(){
      return this._isAuthenticate;
    }

    private setUserObservable(user:IUserResponse | null){
      this.userInfo.next(user);
    }
  
    get getUserObservable(): Observable<IUserResponse | null>{
      return this.userObservable$;
    }

  constructor() {
    // Optional: Listen to storage changes from other tabs/windows
    if (typeof window !== 'undefined') {
        window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  // --- Core Methods ---

  login(credentials: { login: string; password: string ; rememberMe:boolean  }): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.API.AUTH_API}login`, credentials).pipe(
      tap((response) => {
        this.setUserLogin(response.entity);
      }), // Store token on success
      catchError(this.handleError) // Centralized error handling
    );
  }

  userRegister(signUp:ISignup):Observable<MessageResponse>{
    return this.http.post<MessageResponse>(this.API.AUTH_API + 'user-register', signUp , this.API.headerJsonType).pipe(
           delay(100)
      );
 }

 accountRegister(accountSignUp:IAccountSignup):Observable<MessageResponse>{
     
  return this.http.post<MessageResponse>(this.API.AUTH_API + 'account-register', accountSignUp , this.API.headerJsonType).pipe(
         delay(100)
    );
}

  logout(): Promise<boolean> {
    return new Promise((resolve , reject)=>{
      try{
        this.setAuthentication(false);
        this.setUserObservable(null);
        this.removeToken();
        resolve(true);
      }
      catch{
       reject(false);
      }  
    });
  }


  authByToken(iTokenLogin:ITokenLogin){
    return this.http.post<MessageResponse>(this.API.AUTH_API + 'authenticate', iTokenLogin , this.API.headerJsonType).pipe(
      delay(100)
      );
   }

   authByTokenFromStorge(): Observable<boolean> {
    const token = this.getTokenFromStorage();
    const iTokenLogin : ITokenLogin = {token : token || ''};
    if(token){
       return this.http.post<MessageResponse>(this.API.AUTH_API + 'authenticate', iTokenLogin , this.API.headerJsonType)
        .pipe( tap((response) => {
            if( response.status === 200 ) {
               this.setUserLogin(response.entity);
            }
            else {
              this.setUserLogin(null);
            }
        }),map(response => response.status === 200), 
        catchError(err=>{
          console.log(err);
          this.setUserLogin(null);
          return of(false);
        })
       );
      }
      else
         return of(false);
      
   }

   private setUserLogin(userResonse : IUserResponse | null){
    const  _auth:boolean  = !!userResonse;
    this.setAuthentication(_auth);
    this.setUserObservable(userResonse);
    if(userResonse){
      this.storeAccountId(''+userResonse.account_id)
      this.storeToken(userResonse.token);
    }
    else{
      this.removeAccountId();
      this.removeToken();
    }
   }

  loginIsExists(login:string){
    const iLogin:IUniqueLogin = {id:login};
    return this.http.post<MessageResponse>(this.API.AUTH_API + 'login-exists', iLogin , this.API.headerJsonType).pipe(
      delay(100)
      ); 
   }


  verifyOTP(iVerfiyOtp:IVerifyOTP):Observable<MessageResponse>{
     
    return this.http.post<MessageResponse>(this.API.AUTH_API + 'verify-register', iVerfiyOtp , this.API.headerJsonType).pipe(
           delay(100)
      );

   }

   newOTP(iLogin:ILogin):Observable<MessageResponse>{
     
    return this.http.post<MessageResponse>(this.API.AUTH_API + 'new-otp', iLogin , this.API.headerJsonType).pipe(
           delay(100)
      );

   }

   verfiyOTPResetPassword(iVerfiyOtp:IVerifyOTP):Observable<MessageResponse>{
     
    return this.http.post<MessageResponse>(this.API.AUTH_API + 'verify-reset-password', iVerfiyOtp , this.API.headerJsonType).pipe(
           delay(100)
      );

   }


   forgetPassword(iUniqueLogin:IUniqueLogin):Observable<MessageResponse>{
     
      return this.http.post<MessageResponse>(this.API.AUTH_API + 'forgot', iUniqueLogin , this.API.headerJsonType).pipe(
            delay(100)
        );

    }

    updatePassword(iNewPassword:INewPassword):Observable<MessageResponse>{
     
      return this.http.post<MessageResponse>(this.API.AUTH_API + 'update-password', iNewPassword , this.API.headerJsonType).pipe(
            delay(100)
        );

    }


    getUser(login:string) {
      // debounce
      const URL = this.API.apiHost;
  
      return timer(100)
        .pipe(
          switchMap(() => {
            return this.http.get<IUserResponse>(`${URL}/user-login?id=${login}`)
          })
        );
    }

    userUploadAvatar(formData:FormData):Observable<MessageResponse>{
      return this.http.post<MessageResponse>(this.API.AUTH_API + 'upload-user-avatar', formData ).pipe(
             delay(100)
        );
    }
    
    userUploadImage(formData:FormData):Observable<MessageResponse>{
      return this.http.post<MessageResponse>(this.API.AUTH_API + 'upload-user-image', formData ).pipe(
             delay(100)
        );
    }

  // --- Account Management ---
  private storeAccountId(accountId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCOUNTID_KEY, accountId);
      this.currentAccountId.set(accountId); // Update the signal
      console.log('account stored');
    }
  }

  private removeAccountId(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCOUNTID_KEY);
      this.currentAccountId.set(null); // Update the signal
      console.log('account removed');
    }
  }

  // --- Token Management ---

  private storeToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      this.currentUserToken.set(token); // Update the signal
      console.log('Token stored');
    }
  }

  private removeToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      this.currentUserToken.set(null); // Update the signal
      console.log('Token removed');
    }
  }

  getToken(): string | null {
    // Use the signal as the source of truth within the app
    return this.currentUserToken();
  }

  private getTokenFromStorage(): string | null {
     if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
     }
     return null;
  }

  /// account id

  getAccountId(): string | null {
    // Use the signal as the source of truth within the app
    return this.currentAccountId();
  }

  private getAccountIdFromStorage(): string | null {
     if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(ACCOUNTID_KEY);
     }
     return null;
  }
  // --- Storage Event Handling (Optional but Recommended) ---
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === TOKEN_KEY) {
      // Update the signal if the token changes in another tab
      this.currentUserToken.set(event.newValue);
    }
  }

  // --- Error Handling ---
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      // The response body may contain clues as to what went wrong,
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.status === 401) {
        errorMessage = 'Invalid credentials. Please try again.';
      } else if (error.status === 400) {
        // Potentially include details from error.error if available
        errorMessage = `Bad request: ${error.error?.message || error.message}`;
      }
      // You could parse error.error for more specific messages from your API
    }
    console.error(errorMessage, error);
    return throwError(() => new Error(errorMessage)); // Return an observable error
  }

  // Optional: Cleanup listener on service destruction
  ngOnDestroy() {
    if (typeof window !== 'undefined') {
        window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
    this.userInfo.complete();
  }
}