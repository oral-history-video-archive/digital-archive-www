import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BiographyAdvancedSearchComponent } from './bio-advanced-search.component';

export const biographyAdvancedSearchRoutes: Routes = [
    { path: 'bioadvs', component: BiographyAdvancedSearchComponent }
];

export const biographyAdvancedSearchRouting: ModuleWithProviders = RouterModule.forChild(biographyAdvancedSearchRoutes);
