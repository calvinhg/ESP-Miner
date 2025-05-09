import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private credentials: { username: string; password: string } | null = null;

  setCredentials(username: string, password: string) {
    this.credentials = { username, password };
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.credentials) {
      const authHeader = btoa(`${this.credentials.username}:${this.credentials.password}`);
      request = request.clone({
        setHeaders: {
          Authorization: `Basic ${authHeader}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Clear credentials on authentication failure
          this.credentials = null;
        }
        return throwError(() => error);
      })
    );
  }
} 