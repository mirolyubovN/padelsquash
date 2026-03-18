import HomeVariationA from "@/app/page-variation-a";

export const dynamic = "force-dynamic";

export default async function PreviewPaletteOnePage() {
  return (
    <>
      <style>{`
        :root {
          --background: #F6FAFB;
          --foreground: #111827;
          --surface: #FFFFFF;
          --surface-strong: #111827;
          --accent: #00C2C7;
          --accent-hover: #00A8AC;
          --accent-soft: #E8FBFB;
          --accent-rgb: 0, 194, 199;
          --accent-secondary: #FF6B3D;
          --accent-secondary-rgb: 255, 107, 61;
          --text-on-primary: #FFFFFF;
          --line: #D8E4E6;
          --muted: #52606D;
          --dark: #0F1720;
          --dark-rgb: 15, 23, 32;
          --dark-surface: #16212B;
          --dark-border: #263341;
          --dark-muted: #A8B6C2;
        }
      `}</style>
      <HomeVariationA paletteClassName="ho--palette-1" />
    </>
  );
}
