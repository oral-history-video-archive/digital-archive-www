import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TagComponent } from './tag.component';

export const tagRoutes: Routes = [
    { path: 'tag', component: TagComponent }
];

export const tagRouting: ModuleWithProviders = RouterModule.forChild(tagRoutes);
