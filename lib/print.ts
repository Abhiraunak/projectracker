/** Print the page with `title` as the document title (browsers use it as the PDF's file name), then put it back */
export function printWithTitle(title: string) {
  const previous = document.title;
  document.title = title;
  window.addEventListener("afterprint", () => (document.title = previous), { once: true });
  window.print();
}
