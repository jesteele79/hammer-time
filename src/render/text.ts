import { BitmapFont, BitmapText } from "pixi.js";

export type FontKind = "display" | "ui";
let installed: Promise<void> | null = null;

/** Rasterizes both families once at 64 px; text scales from there (spec §5.7). */
export function installFonts(): Promise<void> {
  installed ??= (async () => {
    try {
      await Promise.all([
        document.fonts.load("800 64px 'Barlow Condensed'"),
        document.fonts.load("600 48px 'Inter'"),
      ]);
    } catch {
      // The system font stands in when the webfont is unreachable.
    }
    BitmapFont.install({
      name: "display",
      style: { fontFamily: "Barlow Condensed", fontWeight: "800", fontSize: 64, fill: "#ffffff" },
    });
    BitmapFont.install({
      name: "ui",
      style: { fontFamily: "Inter", fontWeight: "600", fontSize: 48, fill: "#ffffff" },
    });
  })();
  return installed;
}

export function label(text: string, kind: FontKind, size = 32): BitmapText {
  return new BitmapText({ text, style: { fontFamily: kind, fontSize: size } });
}
