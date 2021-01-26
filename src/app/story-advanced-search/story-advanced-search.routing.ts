import { ModuleWithProviders }  from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StoryAdvancedSearchComponent } from './story-advanced-search.component';

export const storyAdvancedSearchRoutes: Routes = [
    { path: 'storyadvs', component: StoryAdvancedSearchComponent }
];

export const storyAdvancedSearchRouting: ModuleWithProviders = RouterModule.forChild(storyAdvancedSearchRoutes);
