// Created to support a common event handler, noMouseFocus, for use across its subclasses.
export class ThinBaseComponent {
  public noMouseFocus($event: MouseEvent): void {
    // Stop mouse clicks from focusing on a non-interactive element with a tabindex of "-1" (e.g., managed focus moves
    // focus to it in code, but users not expected to focus it via keyboard or mouse, such as a header element.)
    $event.preventDefault();
  }
}
