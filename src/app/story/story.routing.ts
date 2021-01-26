import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StoryComponent } from './story.component';

export const storyRoutes: Routes = [
    { path: 'story/:ID', component: StoryComponent }
];

export const storyRouting: ModuleWithProviders = RouterModule.forChild(storyRoutes);
