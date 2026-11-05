import { normalizeServerUrl } from "./serverUrl";

describe("normalizeServerUrl", () => {
  it.each([
    ["mail.example.com", "https://mail.example.com"],
    ["  https://mail.example.com/  ", "https://mail.example.com"],
    ["http://192.168.1.10:8080", "http://192.168.1.10:8080"],
    ["https://example.com/silo/", "https://example.com/silo"],
    ["https://mail.example.com/api/v1", "https://mail.example.com"],
    ["HTTPS://Mail.Example.com", "https://mail.example.com"],
  ])("accepts %j as %j", (input, expected) => {
    expect(normalizeServerUrl(input)).toBe(expected);
  });

  it.each(["", "   ", "ftp://example.com", "https://", "mail example.com", "https://a.b/?x=1"])(
    "rejects %j",
    (input) => {
      expect(normalizeServerUrl(input)).toBeNull();
    },
  );
});
