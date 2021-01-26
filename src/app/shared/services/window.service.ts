// CREDIT: https://github.com/semanticbits/previous-url-example
import { Injectable } from '@angular/core';

function _window(): Window {
  // return the global native browser window object
  return window;
}

@Injectable({
  providedIn: 'root'
})
export class WindowService {
  get nativeWindow(): Window {
    return _window();
  }
}
