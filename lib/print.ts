export function printWithTitle(title: string) {
  const previous = document.title;
  document.title = title;
  window.addEventListener("afterprint", () => (document.title = previous), { once: true });
  window.print();
}