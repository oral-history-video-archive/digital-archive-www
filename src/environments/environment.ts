// Default Environment (local development)
// The build system defaults to the development environment which uses `environment.ts`. 
// Environment can be specified using the `--configuration` flag, ex: `ng build --configuration=production`.
// The list of which environment maps to which file can be found in `angular.json`.
import { common } from './common';

export const environment = {
  production: false,
  hmr: true,
  // client configuruationn
  serviceBase: "https://localhost:44303/api/",  // Locally hosted API
  mediaBase: "your-base-url-to-the-media-files",
  firstInterviewYear: 1993,
  mixtapes: common.mixtapes
};
