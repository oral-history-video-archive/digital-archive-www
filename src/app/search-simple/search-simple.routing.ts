import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SearchSimpleComponent } from './search-simple.component';

export const searchSimpleRoutes: Routes = [
    { path: 'search', component: SearchSimpleComponent }
];

export const searchSimpleRouting: ModuleWithProviders = RouterModule.forChild(searchSimpleRoutes);
