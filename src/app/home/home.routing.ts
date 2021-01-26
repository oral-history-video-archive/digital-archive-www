import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';
import { RouteNotFoundComponent } from './not-found.component';

// NOTE:  /home is the default page, i.e., the "home" page, for the app
export const homeRoutes: Routes = [
    {
        path: '',
        redirectTo: '/home',
        pathMatch: 'full'
    },
    { path: 'home', component: HomeComponent },
    { path: '**', component: RouteNotFoundComponent } // NOTE: wildcard must be last, and homeRouting must always be last in sets of routes
];

export const homeRouting: ModuleWithProviders = RouterModule.forChild(homeRoutes);
