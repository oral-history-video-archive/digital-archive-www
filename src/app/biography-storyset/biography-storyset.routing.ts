import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BiographyStorySetComponent } from './biography-storyset.component';

export const biographyStorySetRoutes: Routes = [
    { path: 'storiesForBio', component: BiographyStorySetComponent }
];

export const biographyStorySetRouting: ModuleWithProviders = RouterModule.forChild(biographyStorySetRoutes);
