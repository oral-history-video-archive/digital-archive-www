# digital-archive-www
The HistoryMakers Digital Video Archive is a web-based single page application (SPA) built with [Angular](https://angular.io/), [TypeScript](https://www.typescriptlang.org/), and Angular Flex Layout for responsive layout.

## Installation
Run `npm install` in the root of the project directory to install the necessary build tools and depedencies.

## Build and Deploy

> **NOTE: All of the build and deployment configurations have changed as of December 11, 2020.  Please read carefully.**

### Build Environments and Associated Resources

The application build is handled by [Angular CLI](https://cli.angular.io/), refer to the [documentation](https://github.com/angular/angular-cli/wiki) for further details.

> **IMPORTANT: As of December 2020 the development environment requires a locally hosted API**
> 
> All hosted versions of the Digital Archive API require authentication and are inaccessible to a locally hosted client, therefore the default development configuration requires the API to be locally hosted at https://localhost:44303/api. This is the default debug/development configuration for the .NET API.

There are two primary configuration environments as follows:

| Environment | Build Command                         | Build Target              | Client URL             | Configured serviceBase      | Configured mediaBase  |
|:------------|:--------------------------------------|:--------------------------|:-----------------------|:----------------------------|:----------------------|
| (default)   | `ng serve`                            | (development)             | http://localhost:4200/ | https://localhost:44303/api | `your-mediabase-here` |
| production  | `ng build --configuration=production` | `your-production-website` | https://your.site.here | api/                        | `your-mediabase-here` |


### Deploying to Azure

**NOTES**
1) For authentication to work properly, the Angular application must be bundled and deployed together with the .NET API.
2) Deployment is handled by Visual Studio 2019, refer to the digital-archive-api documentation for publishing specifics.

## Browsers

### Recommended
We primarily develop using Chrome and as a result, it is the browser that is best supported.  We recommend using Chrome for the best user experience.

### Tested
We actively test the latest versions of the following browsers:

- Chrome
- Safari

We occasionally test the following browsers:
- Firefox
- Edge

## Known Issues
* IE support was retired in 2020.

## Resources 
Font sizing has been implemented using rems and ems. For more information see: https://css-tricks.com/rems-ems/.

## Dependencies
* [Angular](https://angular.io/) - Web application framework (version 9, from 2020)
* [Angular CLI](https://cli.angular.io/) - A command line interface for Angular
* [angular-hmr](https://github.com/gdi2290/angular-hmr) - Angular Hot Module Replacement. Used by default when when running `ng serve`.

