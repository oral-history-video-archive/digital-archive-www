import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';

import { Router } from '@angular/router';
import { takeUntil } from "rxjs/operators";

import { TitleManagerService } from '../shared/title-manager.service';
import { TagService } from './tag.service';
import { TagChosenSetService } from './tag-chosen-set.service';

import { SelectableTagBranch } from './selectable-tag-branch';
import { SelectableTagDetail } from './selectable-tag-detail';

import { StorySetType} from '../storyset/storyset-type';
import { GlobalState } from '../app.global-state';
import { BaseComponent } from '../shared/base.component';

import { HistoryMakerService } from '../historymakers/historymaker.service'; // needed for corpus details

import { UserSettingsManagerService } from '../user-settings/user-settings-manager.service';

import {LiveAnnouncer} from '@angular/cdk/a11y'; // used to read changes to the number of items, e.g., instead of
// <h2 aria-live="polite" class="tagSummary">{{tagMatchSummary}} {{descForSubset}}</h2> ...which sometimes was double-read by screen readers.
// Angular folks recognized this and added in a timer to take care of it in their LiveAnnouncer implementation.

@Component({
    selector: 'thda-tag',
    templateUrl: './tag.component.html',
    styleUrls: ['./tag.component.scss']
})
export class TagComponent extends BaseComponent implements OnInit, OnDestroy {
    // NOTE: framework for tag tree is very much legacy work dating to 2009 and not changed since then; note that data is
    // expected in certain form via this constant and with comment at the head of the view for this work (i.e., tag.component.html):
    private EXPECTED_TAG_BRANCHES: number = 12;

    signalFocusToTitle: boolean = false;

    tagMatchCountForSummary: number = 0;
    tagMatchOpeningExcuse: string = "";
    tagMatchSummary: string = "";
    hasNoTagSpec: boolean = true;
    descForSubset: string = "";
    tagBranches: SelectableTagBranch[] = null; // when populated, exactly EXPECTED_TAG_BRANCHES elements are expected
    clearIsPending: boolean;

    contextGroupOpened: boolean = true;
    qualitiesGroupOpened: boolean = true;
    themesGroupOpened: boolean = true;

    constructor(private router: Router, private globalState: GlobalState, private titleManagerService: TitleManagerService,
        private historyMakerService: HistoryMakerService,
        private tagService: TagService, private tagChosenSetService: TagChosenSetService,
        private userSettingsManagerService: UserSettingsManagerService,
        private liveAnnouncer: LiveAnnouncer) {

        super(); // for BaseComponent extension (brought in to cleanly unsubscribe from subscriptions)

        // Start off with an empty signal about what to focus on (done after facet families initialized)
        this.clearSignalsForCurrentFocusSetting();
        this.hasNoTagSpec = true;
        this.tagMatchCountForSummary = 0;
        this.clearIsPending = false;

        this.tagBranches = null;
    }

    ngOnInit() {
        // As noted in accessibility report, keep the page title the same as the <h1> element title,
        // which is constant for this component of simply "Topic Search" with the suffix embellishment OK (and used elsewhere,
        // i.e., tacking on ", The HistoryMakers Digital Archive"):
        this.titleManagerService.setTitle("Topic Search, The HistoryMakers Digital Archive");
        this.liveAnnouncer.announce("Topic Search"); // NOTE: using LiveAnnouncer to eliminate possible double-speak

        // Settings related to cached counts (used in giving help about Topic Search)
        this.historyMakerService.getCorpusSpecifics().pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(corpusDetails => {
            this.updateTagExcuse(corpusDetails.biographies.tagged, corpusDetails.biographies.all);
        });

        // NOTE: unlike other components, for the moment this one does not have router parameters
        // that we need to parse - hence there is no code of form this.route.params.forEach....
        this.tagService.getTags().pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(tagTreeFromService => {
                // If service returns non-null answer, try to use it, assuming it has EXPECTED_TAG_BRANCHES branches.
                if (tagTreeFromService != null) {
                    // NOTE: Because of how the html for this component assumes the existence of EXPECTED_TAG_BRANCHES branches,
                    // with embedded code to fill a particular nested set of views for a particular tag tree, give up if
                    // the service data does not have EXPECTED_TAG_BRANCHES.
                    if (tagTreeFromService.branches == null || tagTreeFromService.branches.length != this.EXPECTED_TAG_BRANCHES) {
                        this.tagBranches = null;
                    }
                    else {
                        this.tagBranches = [];
                        var oneBranch: SelectableTagBranch;
                        var oneBranchItem: SelectableTagDetail;
                        var j: number;
                        for (var i = 0; i < this.EXPECTED_TAG_BRANCHES; i++) {
                            oneBranch = new SelectableTagBranch();
                            oneBranch.branchName = tagTreeFromService.branches[i].branchName;
                            oneBranch.branchOpened = false; // initially start with branch closed (user must open it in UI)
                            oneBranch.branchValues = [];
                            for (var j = 0; j < tagTreeFromService.branches[i].branchValues.length; j++) {
                                oneBranchItem = new SelectableTagDetail(
                                    tagTreeFromService.branches[i].branchValues[j].id,
                                    tagTreeFromService.branches[i].branchValues[j].label,
                                    false);
                                oneBranch.branchValues.push(oneBranchItem);
                            }
                            this.tagBranches.push(oneBranch);
                        }
                    }
                    // NOTE: one way to init this display might be to always clear the chosen tag set,
                    // as in: this.tagDetailService.clear()
                    // Instead, we make use of the current tag choice state to set the interface.
                    this.initInterfaceToMatchTagState();
                    this.UpdateSubsetTitle();
                    this.setFocusAsNeeded(); // set focus now that context and content are loaded
                }
                else {
                    this.tagMatchSummary = "Tag tree could not be loaded.  Tag search is not possible at this time.";
                    this.hasNoTagSpec = true;
                    this.setFocusAsNeeded(); // set focus now that empty context is loaded
                }
            });
    }

    private updateTagExcuse(taggedBiographyCount: number, biographyCount: number) {
      if (biographyCount > 0) {
          // Two forms of excuse dependent on how much of corpus has been tagged.
          var limitForSmallSubsetExcuse: number = biographyCount / 4;
          if (taggedBiographyCount == 0)
              this.tagMatchOpeningExcuse = "None of the " + biographyCount +
              " HistoryMakers have tagged stories.  So, no stories will be returned by the filters below.";
          else if (taggedBiographyCount < limitForSmallSubsetExcuse)
              this.tagMatchOpeningExcuse = "A small subset, just " + taggedBiographyCount + " of " + biographyCount +
              " HistoryMakers, have tagged stories.  You can explore this subset using the filters below.";
          else if (taggedBiographyCount < biographyCount)
              this.tagMatchOpeningExcuse = "A subset, " + taggedBiographyCount + " of " + biographyCount +
                " HistoryMakers, have tagged stories.  You can explore this subset using the filters below.";
          else
              this.tagMatchOpeningExcuse = ""; // no need for an excuse when the whole corpus is tagged
      }
      else
          this.tagMatchOpeningExcuse = ""; // essentially give up when there is no corpus
    }

    private initInterfaceToMatchTagState() {
        // The interface in ngOnInit gets populated with tag names and IDs, but everything is unchecked.
        // There may be a chosen tag set in play with some things set already.

        if (this.tagBranches != null && this.tagChosenSetService.chosenTags.length > 0) {
            var branchIndex: number;
            var leafIndex: number;
            var j: number;

            for (var i = 0; i < this.tagChosenSetService.chosenTags.length; i++) {
                branchIndex = this.tagChosenSetService.chosenTags[i].branchIndex;
                leafIndex = this.tagChosenSetService.chosenTags[i].leafIndex;
                if (branchIndex >= 0 && branchIndex < this.tagBranches.length && leafIndex >= 0 &&
                    leafIndex < this.tagBranches[branchIndex].branchValues.length) {
                    // quick data integrity check passes; mark the chosen tag as selected in the model held in this.tagBranches
                    this.tagBranches[branchIndex].branchValues[leafIndex].selected = true;
                }
            }
        }
    }

    private setFocusAsNeeded() {
        // Forget some signalling to other routes, given this context of topic/tag search has no selected mixtape or story or bio.
        this.userSettingsManagerService.updateMixtapeIDToFocus(this.globalState.NOTHING_CHOSEN); // no mixtape context
        this.userSettingsManagerService.updateStoryIDToFocus(this.globalState.NOTHING_CHOSEN); // no single story context
        this.userSettingsManagerService.updateBioIDToFocus(this.globalState.NO_ACCESSION_CHOSEN); // no single bio context
        if (this.globalState.IsInternalRoutingWithinSPA) {
            this.globalState.IsInternalRoutingWithinSPA = false;
            // Set default focus to the title for this route, since we did internally route
            // in the SPA (single page application)
            // (as it is the target for skip-to-main content as well)
            this.signalFocusToTitle = true;
        }
    }

    private clearSignalsForCurrentFocusSetting() {
        this.signalFocusToTitle = false;
    }

    toggleGivenTag(branchIndex: number, leafIndex: number) {
      if (branchIndex >= 0 && branchIndex < this.tagBranches.length) {
          if (leafIndex >= 0 && leafIndex < this.tagBranches[branchIndex].branchValues.length) {
              // Selector/identifier data is valid.  Toggle the selected setting for this item.
              this.tagBranches[branchIndex].branchValues[leafIndex].selected = !this.tagBranches[branchIndex].branchValues[leafIndex].selected;
              // 0, t, oneTag.id, oneTag.label
              if (this.tagBranches[branchIndex].branchValues[leafIndex].selected)
                  this.tagChosenSetService.addTagChoice(this.tagBranches[branchIndex].branchValues[leafIndex].id, branchIndex, leafIndex,
                    this.tagBranches[branchIndex].branchValues[leafIndex].label);
              else
                  this.tagChosenSetService.removeTagChoice(this.tagBranches[branchIndex].branchValues[leafIndex].id);
              this.UpdateSubsetTitle();
          }
      }
    }

    onTagChange(branchIndex: number, leafIndex: number, id: string, label: string, isChecked: boolean) {
        if (isChecked)
            this.tagChosenSetService.addTagChoice(id, branchIndex, leafIndex, label);
        else
            this.tagChosenSetService.removeTagChoice(id);
        this.UpdateSubsetTitle();
    }

    doTagSearch() {
        // Pass along the current tag specification, which must be available (it should be based on how
        // the button that triggers this function is enabled only if a tag spec is given with non-zero results):
        if (this.tagChosenSetService.tagSpec != null && this.tagChosenSetService.tagSpec.length > 0) {

            // Only pursue showing story set for given tag query if a query is specified.

            var moreParams = [];
            moreParams['q'] = this.tagChosenSetService.tagSpec;
            // IMPORTANT:  use tracking for this search query (so set a 'ut' parameter in the route to flag it for tracking/logging)
            moreParams['ut'] = 1;
            this.clearSignalsForCurrentFocusSetting(); // on router update, clear any signals about focus
            this.router.navigate(['/stories', StorySetType.TagSearch, moreParams]);
        }
    }

    clearTags() {
        var haveTagsToUncheck: boolean = (this.tagChosenSetService.chosenTags.length > 0);
        this.tagChosenSetService.clear();
        if (haveTagsToUncheck) {
            for (var branchIterator = 0; branchIterator < this.tagBranches.length; branchIterator++)
                for (var leafIterator = 0; leafIterator < this.tagBranches[branchIterator].branchValues.length; leafIterator++)
                    this.tagBranches[branchIterator].branchValues[leafIterator].selected = false;
        }
        this.UpdateSubsetTitle();
        // Set the focus away from the Clear button, to the tag selection area.
        this.signalFocusToTitle = false; // make sure a change will be signalled
        setTimeout(() => {
          this.signalFocusToTitle = true; // this will signal the need to focus on the title (as there is no non-disabled Clear button)
        });
    }

    private UpdateSubsetTitle() {
        var newTitle: string = this.tagChosenSetService.description;
        if (newTitle.length == 0) {
            this.clearIsPending = true; // used to reset any in-progress computation of "checking tagged stories...."
            this.descForSubset = "";
            this.tagMatchSummary = "";
            this.hasNoTagSpec = true;
            this.tagMatchCountForSummary = 0;
        }
        else {
            this.clearIsPending = false; // have 1 or more tags to check
            this.tagMatchSummary = "";
            this.tagChosenSetService.tagMatchCount().pipe(takeUntil(this.ngUnsubscribe))
                .subscribe(ans => {
                    var connector: string;
                    if (!this.clearIsPending) {
                        this.hasNoTagSpec = false;
                        this.tagMatchCountForSummary = ans;
                        if (ans != 1)
                            connector = " stories have ";
                        else
                            connector = " story has ";
                        if (this.tagChosenSetService.chosenTags.length == 1)
                            this.tagMatchSummary = ans + connector + "this tag:";
                        else
                            this.tagMatchSummary = ans + connector + "all these tags:";
                    }
                    // else // this.clearIsPending: nothing really to do:
                        // During the delay, user may have cleared out tag choices via "Clear" button or
                        // unchecked all tags - in any case there is nothing left to show so do not update
                        // either this.tagMatchCountForSummary or this.tagMatchSummary - keep them as "cleared."
                },
                error => { this.tagMatchSummary = ""; this.hasNoTagSpec = true; }
              );
            this.descForSubset = newTitle;
            this.liveAnnouncer.announce(this.tagMatchSummary + " " + this.descForSubset); // done here rather than via aria-live tag on h2 element in the rendering
        }
    }
}
