// Production Environment

import { common } from './common';

export const environment = {
  production: true,
  hmr: false,
  // client configuruation
  serviceBase: "api/",
  mediaBase: "your-base-url-to-the-media-files",
  firstInterviewYear: 1993,
  mixtapes: common.mixtapes
};