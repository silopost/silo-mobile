import {
  contentPolicy,
  hasRemoteImages,
  inlineAttachmentIds,
  prepareHtml,
  toBase64,
} from "./messageHtml";

const csp = (doc: string) =>
  /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(doc)?.[1] ?? "";

describe("prepareHtml", () => {
  const remote = '<p>Hi</p><img src="https://tracker.example/pixel.gif">';

  it("blocks remote images by CSP until images are shown", () => {
    const blocked = csp(prepareHtml(remote, { showImages: false }));
    expect(blocked).toContain("img-src data: blob:;");
    expect(blocked).not.toMatch(/https:|http:/);
    expect(blocked).toContain("default-src 'none'");

    const shown = csp(prepareHtml(remote, { showImages: true }));
    expect(shown).toContain("img-src data: blob: https: http:");
  });

  it("puts the CSP before the message body", () => {
    const doc = prepareHtml(remote, { showImages: false });
    expect(doc.indexOf("Content-Security-Policy")).toBeLessThan(doc.indexOf("<img"));
  });

  it("swaps inline (cid:) attachment URLs for data URIs", () => {
    const html =
      '<img src="/api/v1/attachments/a_44?inline=1"><img src="/api/v1/attachments/a_45?inline=1">';
    const doc = prepareHtml(html, {
      showImages: false,
      inline: { a_44: "data:image/png;base64,AAAA" },
    });
    expect(doc).toContain('<img src="data:image/png;base64,AAAA">');
    // Not fetched (over the budget): left as it was, never with a token.
    expect(doc).toContain('src="/api/v1/attachments/a_45?inline=1"');
  });

  it("drops scripts and active tags the server should have removed", () => {
    const doc = prepareHtml(
      '<p>a</p><script>alert(1)</script><iframe src="x"></iframe><base href="https://evil">',
      { showImages: false },
    );
    expect(doc).not.toMatch(/alert|<iframe|<base/);
    expect(doc).toContain("<p>a</p>");
  });

  it("sizes to the device width so wide mail scrolls sideways", () => {
    expect(prepareHtml("<p/>", { showImages: false })).toContain(
      'name="viewport" content="width=device-width, initial-scale=1"',
    );
  });
});

describe("helpers", () => {
  it("finds remote images in img tags and CSS", () => {
    expect(hasRemoteImages('<img src="http://x/y.png">')).toBe(true);
    expect(hasRemoteImages("<div style=\"background:url('https://x/y.png')\">")).toBe(true);
    expect(hasRemoteImages('<img src="/api/v1/attachments/a_1?inline=1">')).toBe(false);
    expect(hasRemoteImages("<p>no images</p>")).toBe(false);
  });

  it("lists inline attachment ids once", () => {
    const html =
      '<img src="/api/v1/attachments/a_1?inline=1"><img src="/api/v1/attachments/a_1?inline=1">' +
      '<img src="/api/v1/attachments/a_2b?inline=1">';
    expect(inlineAttachmentIds(html)).toEqual(["a_1", "a_2b"]);
  });

  it("encodes base64 like the standard", () => {
    const enc = (s: string) => toBase64(new TextEncoder().encode(s));
    expect(enc("")).toBe("");
    expect(enc("f")).toBe("Zg==");
    expect(enc("fo")).toBe("Zm8=");
    expect(enc("foo")).toBe("Zm9v");
    expect(enc("foobar!")).toBe("Zm9vYmFyIQ==");
  });

  it("never allows remote content but images", () => {
    expect(contentPolicy(true)).not.toMatch(/(default|style|font|script)-src[^;]*https?:/);
  });
});
