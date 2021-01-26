import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ContentLinksComponent } from './content-links.component';

export const contentLinksRoutes: Routes = [
    { path: 'contentlinks', component: ContentLinksComponent }
];

export const contentLinksRouting: ModuleWithProviders = RouterModule.forChild(contentLinksRoutes);
