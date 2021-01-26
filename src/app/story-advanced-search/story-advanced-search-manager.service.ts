import { Injectable } from '@angular/core';
import { Subject }    from 'rxjs/Subject';
import { isNumber } from 'util';

// The purpose of this service is to retrieve and store in localStorage the advanced story search settings,
// such as filter by interview date range, the minimum acceptable interview year and maximum acceptable interview year.
@Injectable()
export class StoryAdvancedSearchSettingsManagerService {

  public filterByInterviewDate: Subject<boolean> = new Subject<boolean>();
  public filterByInterviewDate$ = this.filterByInterviewDate.asObservable();

  public minYear: Subject<number> = new Subject<number>();
  public minYear$ = this.minYear.asObservable();

  public maxYear: Subject<number> = new Subject<number>();
  public maxYear$ = this.maxYear.asObservable();

  private FILTER_BY_INTERVIEW_DATE_SETTING_NAME: string = "filterbyinterviewyear";
  private MIN_YEAR_SETTING_NAME: string = "mininterviewyearforfilter";
  private MAX_YEAR_SETTING_NAME: string = "maxinterviewyearforfilter";
  private localFilterByInterviewDate: boolean = false;
  private localMinYear: number = 0; // 0 anticipated to be same as "not set"
  private localMaxYear: number = 0; // 0 anticipated to be same as "not set"

  constructor() {
      var temp: string;
      temp = JSON.parse(localStorage.getItem(this.FILTER_BY_INTERVIEW_DATE_SETTING_NAME) || "0");
      this.localFilterByInterviewDate = (temp == "1");
      this.filterByInterviewDate.next(this.localFilterByInterviewDate);
      temp = JSON.parse(localStorage.getItem(this.MIN_YEAR_SETTING_NAME) || "0");
      if (isNumber(temp)) {
          this.localMinYear = +temp;
          this.minYear.next(this.localMinYear);
      }
      temp = JSON.parse(localStorage.getItem(this.MAX_YEAR_SETTING_NAME) || "0");
      if (isNumber(temp)) {
          this.localMaxYear = +temp;
          this.maxYear.next(this.localMaxYear);
      }
  }

  ngOnInit() {
    this.filterByInterviewDate.next(this.localFilterByInterviewDate);
    this.minYear.next(this.localMinYear);
    this.maxYear.next(this.localMaxYear);
  }

  public currentFilterByInterviewDateSetting(): boolean {
      return this.localFilterByInterviewDate;
  }

  public currentMinYearForFilterByInterviewDate(): number {
    return this.localMinYear;
  }

  public currentMaxYearForFilterByInterviewDate(): number {
    return this.localMaxYear;
  }

  public updateFilterByInterviewDateSetting(newSetting: boolean) {
    var temp: string;
    if (newSetting)
      temp = "1";
    else
      temp = "0";
    localStorage.setItem(this.FILTER_BY_INTERVIEW_DATE_SETTING_NAME, temp);
    this.localFilterByInterviewDate = (temp == "1");
    this.filterByInterviewDate.next(this.localFilterByInterviewDate);
  }

  public updateMinYearForFilterByInterviewDate(newSetting: number) {
    var temp: string = newSetting.toString();
    localStorage.setItem(this.MIN_YEAR_SETTING_NAME, temp);
    this.localMinYear = newSetting;
    this.minYear.next(this.localMinYear);
  }

  public updateMaxYearForFilterByInterviewDate(newSetting: number) {
    var temp: string = newSetting.toString();
    localStorage.setItem(this.MAX_YEAR_SETTING_NAME, temp);
    this.localMaxYear = newSetting;
    this.maxYear.next(this.localMaxYear);
  }

}
