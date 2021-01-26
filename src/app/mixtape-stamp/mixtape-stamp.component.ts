import { Component, Input} from '@angular/core';

import { Mixtape } from './mixtape';
import { environment } from '../../environments/environment';

@Component({
    selector: 'thda-mix',
    templateUrl: './mixtape-stamp.component.html',
    styleUrls: ['./mixtape-stamp.component.scss'],
})

// This class is used to present a single mixtape, i.e., a single front door to a set of stories known as a "mixtape", in a presumed grid/list of mixtapes.
// It takes as input the mixtape details in the form of a Mixtape object.
export class MixtapeStampComponent {
    @Input() mixtapeInput: Mixtape;
    @Input('selectedID') selectedMixtapeID: number;

    public myMediaBase: string;

    constructor() {
      this.myMediaBase = environment.mediaBase;
    }

    isSelected(mixTape: Mixtape) {
        return mixTape.mixSetID == this.selectedMixtapeID;
    }
}
