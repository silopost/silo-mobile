import type { UploadInfo } from "../api/types";
import {
  hasInlineImages,
  refersToInline,
  toEditorContent,
  toServerHtml,
  toServerJson,
} from "./inlineImages";

const pic: UploadInfo = {
  id: "u_9",
  cid: "c9@silo",
  inline: true,
  thumbnail: true,
  filename: "a.png",
  contentType: "image/png",
  size: 10,
};
const uri = "data:image/png;base64,AAAA";
const previews = new Map([["c9@silo", uri]]);

test("editor previews and upload URLs become cid: for the server", () => {
  expect(toServerHtml(`<p>x</p><img src="${uri}">`, previews, [pic])).toBe(
    '<p>x</p><img src="cid:c9@silo">',
  );
  expect(toServerHtml('<img src="/api/v1/attachments/u_9?inline=1">', new Map(), [pic])).toBe(
    '<img src="cid:c9@silo">',
  );
});

test("bodyJson keeps silo-web's form: the upload URL with its cid", () => {
  const doc = { type: "doc", content: [{ type: "image", attrs: { src: uri, alt: null } }] };
  expect(toServerJson(doc, previews, [pic])).toEqual({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { src: "/api/v1/attachments/u_9?inline=1", alt: null, cid: "c9@silo" },
      },
    ],
  });
});

test("the server's cid: and upload URLs are shown with the previews", () => {
  expect(toEditorContent('<img src="cid:c9@silo">', previews, [pic])).toBe(`<img src="${uri}">`);
  const doc = {
    type: "doc",
    content: [
      { type: "image", attrs: { src: "/api/v1/attachments/u_9?inline=1", cid: "c9@silo" } },
    ],
  };
  expect(toEditorContent(doc, previews, [pic])).toEqual({
    type: "doc",
    content: [{ type: "image", attrs: { src: uri, cid: "c9@silo" } }],
  });
});

test("an inline upload is referred to while its picture is in the text", () => {
  expect(refersToInline(`<img src="${uri}">`, pic, previews)).toBe(true);
  expect(refersToInline("<p>bez obrazu</p>", pic, previews)).toBe(false);
  expect(hasInlineImages('<img src="cid:c9@silo">', [pic])).toBe(true);
  expect(hasInlineImages("<p></p>", [pic])).toBe(false);
});
