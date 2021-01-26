import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StorySetComponent } from './storyset.component';

export const storysetRoutes: Routes = [
    { path: 'stories/:type', component: StorySetComponent }
];

export const storysetRouting: ModuleWithProviders = RouterModule.forChild(storysetRoutes);
