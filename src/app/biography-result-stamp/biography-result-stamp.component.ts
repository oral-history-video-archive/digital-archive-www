import { Component, Input } from '@angular/core';
import { BriefBio } from '../historymakers/brief-bio';
import { environment } from '../../environments/environment';

@Component({
    selector: 'thda-bio-res',
    templateUrl: './biography-result-stamp.component.html',
    styleUrls: ['./biography-result-stamp.component.scss'],
})

// This class is used to present a single biography, i.e., a single interviewee, in a presumed grid/list of biography RESULTS
// from a biography search.  NOTE: it is very similar to biography-stamp (thda-bio) and perhaps later can be merged with that
// class BiographyStampComponent if the differences in renderings are not too challenging for such a merge.
// It takes as input the biography details in the form of a BriefBio object, and the ID of whatever biography might be
// selected to appropriately focus the selected biography in a grid/list.
export class BiographyResultStampComponent {
    @Input() bio: BriefBio;
    @Input('selectedID') selectedBiographyID: string;
    @Input() cardView: boolean;

    public myMediaBase: string;

    constructor() {
      this.myMediaBase = environment.mediaBase;
    }

    isSelected(bio: BriefBio) {
        return bio.document.accession == this.selectedBiographyID;
    }
}
