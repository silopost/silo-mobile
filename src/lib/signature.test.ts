import { signatureToText, textToSignatureHtml } from "./signature";

test("signature HTML reads as lines of text", () => {
  expect(signatureToText("<p>Ala &amp; Jan</p><p>tel. <b>123</b></p>")).toBe("Ala & Jan\ntel. 123");
  expect(signatureToText("Pozdrawiam,<br>Ala")).toBe("Pozdrawiam,\nAla");
  expect(signatureToText("")).toBe("");
});

test("typed lines are saved as escaped HTML with <br>", () => {
  expect(textToSignatureHtml("Pozdrawiam,\nAla <ala@x.pl>\n\n")).toBe(
    "Pozdrawiam,<br>Ala &lt;ala@x.pl&gt;",
  );
  expect(textToSignatureHtml("  \n")).toBe("");
});
