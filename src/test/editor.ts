type FakeEditor = { html: string; type: (html: string) => void };

/** The fake compose editors created so far (jest.setup.ts mocks @10play/tentap-editor). */
const editors = () =>
  (jest.requireMock("@10play/tentap-editor") as { __editors: FakeEditor[] }).__editors;

/** The user types into the last compose editor: its content becomes `html`. */
export function typeInEditor(html: string): void {
  const list = editors();
  const editor = list[list.length - 1];
  if (!editor) throw new Error("No compose editor rendered");
  editor.type(html);
}

/** Content of the last compose editor. */
export function editorHtml(): string | undefined {
  const list = editors();
  return list[list.length - 1]?.html;
}
