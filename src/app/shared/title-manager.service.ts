import { Component }    from '@angular/core';
import { Injectable }   from '@angular/core';
import { Title }        from '@angular/platform-browser';

@Injectable()
export class TitleManagerService {
    constructor(private titleService: Title) { }

    setTitle(newTitle: string) {
        this.titleService.setTitle(newTitle);
    }

    getTitle(): string {
        return this.titleService.getTitle();
    }

}
