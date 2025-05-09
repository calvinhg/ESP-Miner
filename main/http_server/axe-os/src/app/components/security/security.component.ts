import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from 'src/app/services/loading.service';
import { SystemService } from 'src/app/services/system.service';

@Component({
  selector: 'app-security',
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss']
})
export class SecurityComponent implements OnInit {
  public form!: FormGroup;
  public showPassword: boolean = false;
  private originalUsername: string = '';
  private isRestarting: boolean = false;

  @Input() uri = '';

  constructor(
    private fb: FormBuilder,
    private systemService: SystemService,
    private toastr: ToastrService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    // Initialize form with empty values
    this.form = this.fb.group({
      webUsername: ['', [Validators.required]],
      webPassword: ['', [Validators.required]]
    });

    // Subscribe to form value changes
    this.form.valueChanges.subscribe(values => {
      console.log('Form values changed:', values); // Debug log
    });

    // Get system info but don't update form
    this.systemService.getInfo(this.uri)
      .pipe(
        this.loadingService.lockUIUntilComplete()
      )
      .subscribe({
        next: (info) => {
          console.log('Received system info:', info); // Debug log
          this.originalUsername = info.webUsername || 'admin';
          console.log('Setting original username to:', this.originalUsername); // Debug log
          
          // Set initial credentials in system service
          this.systemService.setCredentials(info.webUsername || 'admin', info.webPassword || 'admin');
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.toastr.error('Authentication required. Please enter your credentials.', 'Error');
          } else {
            this.toastr.error(`Failed to get system info: ${err.message}`, 'Error');
          }
        }
      });
  }

  public updateCredentials() {
    const form = this.form.getRawValue();
    console.log('Form values:', form); // Debug log

    // Always send both username and password
    const apiData = {
      username: form.webUsername,
      password: form.webPassword
    };

    console.log('Sending to backend:', apiData); // Debug log

    // Don't send request if both fields are empty
    if (!form.webUsername && !form.webPassword) {
      this.toastr.info('No changes to save', 'Info');
      return;
    }

    // Then proceed with the actual update
    this.systemService.updateWebCredentials(this.uri, apiData)
      .pipe(this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: () => {
          const successMessage = this.uri ? `Updated credentials for ${this.uri}` : 'Updated credentials';
          this.toastr.success(successMessage, 'Success!');
          // Update original username
          this.originalUsername = form.webUsername;
          
          // Update credentials in system service
          this.systemService.setCredentials(form.webUsername, form.webPassword);
          
          // Clear browser's stored credentials
          this.systemService.clearBrowserCredentials();
          
          // Show restart message
          this.toastr.info('Device is restarting...', 'Restarting');
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.toastr.error('Authentication failed. Please check your credentials.', 'Error');
          } else {
            const errorMessage = this.uri ? `Could not update credentials for ${this.uri}. ${err.message}` : `Could not update credentials. ${err.message}`;
            this.toastr.error(errorMessage, 'Error');
          }
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
} 