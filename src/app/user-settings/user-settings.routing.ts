import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UserSettingsComponent } from './user-settings.component';

export const settingsRoutes: Routes = [
    { path: 'settings', component: UserSettingsComponent }
];

export const settingsRouting: ModuleWithProviders = RouterModule.forChild(settingsRoutes);
