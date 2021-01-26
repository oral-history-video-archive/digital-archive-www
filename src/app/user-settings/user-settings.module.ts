import { NgModule }       from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { UserSettingsComponent } from './user-settings.component';
import { settingsRouting } from './user-settings.routing';

@NgModule({
    imports: [
        settingsRouting,
        SharedModule
    ],
    declarations: [
      UserSettingsComponent
    ],
    exports: [UserSettingsComponent]
})
export class UserSettingsModule { }
