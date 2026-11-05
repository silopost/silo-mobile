import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../state/auth";
import { useToasts } from "../../state/toasts";
import { attachment } from "../../test/fixtures";
import { renderScreen } from "../../test/render";
import { SERVER_URL } from "../../test/server";
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

beforeEach(() => {
  mockStatus = 200;
  jest.clearAllMocks();
  useToasts.setState({ current: null });
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
