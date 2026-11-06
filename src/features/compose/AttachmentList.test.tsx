import { fireEvent, screen } from "@testing-library/react-native";
import * as DocumentPicker from "expo-document-picker";
import { renderScreen } from "../../test/render";
import { AttachSheet, AttachmentList } from "./AttachmentList";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));

describe("AttachmentList", () => {
  it("shows attachments and uploads with progress; x removes or cancels", async () => {
    const onRemove = jest.fn();
    const onRemoveUpload = jest.fn();
    await renderScreen(
      <AttachmentList
        attachments={[
          {
            id: "up_1",
            filename: "a.pdf",
            contentType: "application/pdf",
            size: 2048,
            cid: null,
            inline: false,
            thumbnail: false,
          },
        ]}
        uploads={[
          { key: 7, name: "b.png", size: 10, progress: 0.4 },
          { key: 8, name: "c.zip", size: 10, progress: 0, error: "Plik c.zip jest za duży" },
        ]}
        onRemove={onRemove}
        onRemoveUpload={onRemoveUpload}
      />,
    );
    expect(screen.getByLabelText("a.pdf, 2 KB")).toBeTruthy();
    expect(screen.getByLabelText("Przesyłanie b.png")).toBeTruthy();
    expect(screen.getByText("Plik c.zip jest za duży")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText("Usuń załącznik a.pdf"));
    await fireEvent.press(screen.getByLabelText("Anuluj przesyłanie b.png"));
    expect(onRemove).toHaveBeenCalledWith("up_1");
    expect(onRemoveUpload).toHaveBeenCalledWith(7);
  });

  it("'Załącz plik' hands the picked documents over", async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///a.pdf", name: "a.pdf", mimeType: "application/pdf", size: 5 }],
    });
    const onFiles = jest.fn();
    const onDismiss = jest.fn();
    await renderScreen(<AttachSheet visible onDismiss={onDismiss} onFiles={onFiles} />);
    await fireEvent.press(screen.getByRole("button", { name: "Załącz plik" }));
    await new Promise((r) => setTimeout(r, 0));
    expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true }),
    );
    expect(onFiles).toHaveBeenCalledWith([
      { uri: "file:///a.pdf", name: "a.pdf", type: "application/pdf", size: 5 },
    ]);
    expect(onDismiss).toHaveBeenCalled();
  });
});
