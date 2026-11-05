import { avatarAddress, formatListDate, participantNames } from "./format";

const p = (email: string, name = "", unread = false) => ({ email, name, unread });

describe("formatListDate", () => {
  const now = new Date(2026, 10, 5, 15, 0);

  it("shows the time for today", () => {
    expect(formatListDate(new Date(2026, 10, 5, 9, 12).toISOString(), now)).toBe("09:12");
  });

  it("shows day and month for this year", () => {
    expect(formatListDate(new Date(2026, 10, 4, 22, 0).toISOString(), now)).toBe("4 lis");
  });

  it("shows the full date for earlier years", () => {
    expect(formatListDate(new Date(2025, 10, 4, 8, 0).toISOString(), now)).toBe("04.11.2025");
  });

  it("is empty for an invalid date", () => {
    expect(formatListDate("nope", now)).toBe("");
  });
});

describe("participantNames", () => {
  it("shows the full name of a single participant", () => {
    expect(participantNames([p("jan@x.pl", "Jan Kowalski", true)])).toEqual([
      { name: "Jan Kowalski", unread: true },
    ]);
  });

  it("falls back to the address and names the user 'ja'", () => {
    expect(participantNames([p("jan@x.pl")])[0]!.name).toBe("jan@x.pl");
    expect(participantNames([p("me")])[0]!.name).toBe("ja");
  });

  it("shortens up to three names", () => {
    const names = participantNames([p("jan@x.pl", "Jan Kowalski"), p("me"), p("ewa@x.pl")]);
    expect(names.map((n) => n.name)).toEqual(["Jan", "ja", "ewa"]);
  });

  it("keeps the first and the last two of a longer list", () => {
    const names = participantNames([
      p("a@x", "Ala"),
      p("b@x", "Bob"),
      p("c@x", "Cyd"),
      p("d@x", "Dan"),
    ]);
    expect(names.map((n) => n.name)).toEqual(["Ala", "Cyd", "Dan"]);
  });
});

describe("avatarAddress", () => {
  const me = { email: "ala@example.com", name: "Ala" };

  it("picks the last participant who is not the user", () => {
    expect(avatarAddress([p("jan@x.pl", "Jan"), p("ewa@x.pl", "Ewa"), p("me")], me).email).toBe(
      "ewa@x.pl",
    );
  });

  it("falls back to the user's account", () => {
    expect(avatarAddress([p("me")], me)).toBe(me);
  });
});
