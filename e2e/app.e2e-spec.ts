import { UpgradeProjectPage } from './app.po';

describe('Digital Archive App', () => {
  let page: UpgradeProjectPage;

  beforeEach(() => {
    page = new UpgradeProjectPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
