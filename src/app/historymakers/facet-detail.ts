export class FacetDetail {
    public ID: string;
    public value: string;
    public count: number;
    public active: boolean = false;
    public focused: boolean = false;
}

export class FacetFamilyContainer { // used to contain all data needed to render a "my-panel" appropriately in a facet filter interface
  isAllowedToBeShown: boolean; // sometimes a container might be hidden (e.g., in user settings to simplify an interface)
  facets: FacetDetail[];
  title: string;
  nameForLabel: string; // might be a bit longer than the title for some families
  isOpened: boolean;
  signalItemToFocus: string; // signal the focus should go to an item in the facets list with this value (assumes unique values in facets list)
  signalFocusToFamilyParent: boolean; // if true, signals that the focus should go to the parent holding this facet family
}
