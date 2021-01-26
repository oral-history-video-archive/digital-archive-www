import { Injectable } from '@angular/core';
import { Subject }    from 'rxjs/Subject';
import { SearchFormOptions } from './search-form-options';
import { GlobalState } from '../../app.global-state';

@Injectable()
export class SearchFormService {
  private _notsetyet: boolean = true;
  private localSearchOptions: SearchFormOptions;
  public searchOptions: Subject<SearchFormOptions> = new Subject<SearchFormOptions>();
  public searchOptions$ = this.searchOptions.asObservable();

    constructor(private globalState: GlobalState) {
      if (this._notsetyet) {
          this._notsetyet = false;
          // Do initial set-up of the options (after this, all changes done with setSearchOptions since localSearchOptions will have a value).
          this.localSearchOptions = new SearchFormOptions(false, this.globalState.NOTHING_CHOSEN, this.globalState.NO_ACCESSION_CHOSEN, false);
          this.searchOptions.next(this.localSearchOptions);
      }
    }

    setSearchOptions(options: SearchFormOptions) {
        if (options.searchingBiographies != this.localSearchOptions.searchingBiographies ||
            options.allowAdvancedStorySearchSettings != this.localSearchOptions.allowAdvancedStorySearchSettings ||
            options.biographyAccessionID != this.localSearchOptions.biographyAccessionID ||
            options.biographyIDForLimitingSearch != this.localSearchOptions.biographyIDForLimitingSearch)
        {
            this.localSearchOptions = options;
            this.searchOptions.next(this.localSearchOptions);
        }
    }

    public currentSearchOptions(): SearchFormOptions {
        return this.localSearchOptions;
    }
}
