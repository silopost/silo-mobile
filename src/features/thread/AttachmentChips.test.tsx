import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { queryClient } from "../../api/cache";
import { useAuth } from "../../state/auth";
import { useToasts } from "../../state/toasts";
import { attachment } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { serveMeta, SERVER_URL, setupMsw } from "../../test/server";
import { AttachmentChips, attachmentIcon } from "./AttachmentChips";

let mockStatus = 200;

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  createDownloadResumable: jest.fn(
    (
      url: string,
      fileUri: string,
      _opts: unknown,
      progress?: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
    ) => ({
      downloadAsync: jest.fn(async () => {
        progress?.({ totalBytesWritten: 5, totalBytesExpectedToWrite: 10 });
        return { uri: fileUri, status: mockStatus, headers: {}, mimeType: null };
      }),
    }),
  ),
  deleteAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

const download = FileSystem.createDownloadResumable as jest.Mock;

setupMsw();

beforeEach(() => {
  mockStatus = 200;
  jest.clearAllMocks();
  useToasts.setState({ current: null });
  // GET /meta is cached for good: each test answers its own server version.
  queryClient.clear();
  useAuth.setState({ status: "signedIn", serverUrl: SERVER_URL, token: "tok_1" });
});

describe("AttachmentChips", () => {
  it("lists files that are not inline with name and size", async () => {
    await renderScreen(
      <AttachmentChips
        attachments={[
          attachment({}),
          attachment({ id: "a_2", inline: true, filename: "logo.png" }),
        ]}
      />,
    );
    expect(screen.getByText("oferta.pdf")).toBeOnTheScreen();
    expect(screen.getByText("18 KB")).toBeOnTheScreen();
    expect(screen.queryByText("logo.png")).toBeNull();
    expect(screen.getByRole("button", { name: "Załącznik oferta.pdf, 18 KB" })).toBeOnTheScreen();
  });

  it("downloads with the bearer header into the cache and shares the file", async () => {
    await renderScreen(<AttachmentChips attachments={[attachment({})]} />);

    await fireEvent.press(screen.getByTestId("attachment-a_1"));

    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    const [url, fileUri, opts] = download.mock.calls[0] as [
      string,
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe(`${SERVER_URL}/api/v1/attachments/a_1`);
    expect(url).not.toContain("tok_1");
    expect(fileUri).toBe("file:///cache/a_1-oferta.pdf");
    expect(opts.headers.Authorization).toBe("Bearer tok_1");
    expect(opts.headers["X-Silo-Client"]).toMatch(/^silo-mobile\//);
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/a_1-oferta.pdf", {
      mimeType: "application/pdf",
      dialogTitle: "oferta.pdf",
    });
  });

  it("says the attachment is not fetched yet on 503", async () => {
    mockStatus = 503;
    await renderScreen(<AttachmentChips attachments={[attachment({})]} />);

    await fireEvent.press(screen.getByTestId("attachment-a_1"));

    await waitFor(() =>
      expect(useToasts.getState().current?.message).toBe(
        "Załącznik jeszcze niepobrany, spróbuj za chwilę",
      ),
    );
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });

  it("picks an icon by type", () => {
    expect(attachmentIcon("image/png", "a.png")).toBe("file-image-outline");
    expect(attachmentIcon("application/octet-stream", "a.pdf")).toBe("file-pdf-box");
    expect(attachmentIcon("application/zip", "a.zip")).toBe("folder-zip-outline");
    expect(attachmentIcon("application/x-unknown", "a.bin")).toBe("file-outline");
  });
});

describe("thumbnails (server 0.4.0)", () => {
  const photo = attachment({
    id: "a_7",
    filename: "plaza.jpg",
    contentType: "image/jpeg",
    thumbnail: true,
  });

  it("shows the server thumbnail fetched with the bearer header", async () => {
    serveMeta("0.4.0");
    await renderScreen(<AttachmentChips attachments={[photo, attachment({})]} />);

    const img = await screen.findByTestId("thumbnail-a_7");
    expect(img.props.source).toEqual({
      uri: `${SERVER_URL}/api/v1/attachments/a_7/thumbnail?size=s`,
      headers: {
        Authorization: "Bearer tok_1",
        "X-Silo-Client": expect.stringMatching(/^silo-mobile./),
      },
    });
    // A PDF keeps the icon of its type.
    expect(screen.queryByTestId("thumbnail-a_1")).toBeNull();
  });

  it("falls back to the icon when the server has no thumbnail (415)", async () => {
    serveMeta("0.4.0");
    await renderScreen(<AttachmentChips attachments={[photo]} />);
    const img = await screen.findByTestId("thumbnail-a_7");
    await fireEvent(img, "error", { nativeEvent: { error: "415" } });
    expect(screen.queryByTestId("thumbnail-a_7")).toBeNull();
  });

  it("opens a full-screen preview with the picture and shares it from there", async () => {
    serveMeta("0.4.0");
    await renderScreen(<AttachmentChips attachments={[photo]} />);
    await screen.findByTestId("thumbnail-a_7");
    await fireEvent.press(screen.getByRole("button", { name: "Załącznik plaza.jpg, 18 KB" }));

    const full = await screen.findByTestId("image-full-a_7");
    expect(full.props.source).toMatchObject({
      uri: `${SERVER_URL}/api/v1/attachments/a_7?inline=1`,
      headers: { Authorization: "Bearer tok_1" },
    });
    expect(download).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Udostępnij lub zapisz" }));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    expect(screen.queryByTestId("image-preview-a_7")).toBeNull();
  });

  it("asks for no thumbnail from a 0.3.0 server", async () => {
    await renderScreen(<AttachmentChips attachments={[photo]} />);
    expect(await screen.findByText("plaza.jpg")).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByTestId("thumbnail-a_7")).toBeNull());
  });
});
