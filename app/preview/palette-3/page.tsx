import HomeVariationA from "@/app/page-variation-a";

export const dynamic = "force-dynamic";

export default async function PreviewPaletteThreePage() {
  return (
    <>
      <style>{`
        :root {
          --background: #F7FBF8;
          --foreground: #101418;
          --surface: #FFFFFF;
          --surface-strong: #101418;
          --accent: #00C96B;
          --accent-hover: #00AF5D;
          --accent-soft: #E8FAF1;
          --accent-rgb: 0, 201, 107;
          --accent-secondary: #FF6A3D;
          --accent-secondary-rgb: 255, 106, 61;
          --text-on-primary: #FFFFFF;
          --line: #D7E6DD;
          --muted: #51605A;
          --dark: #12211B;
          --dark-rgb: 18, 33, 27;
          --dark-surface: #193128;
          --dark-border: #2F4A3E;
          --dark-muted: #AFC0B7;
        }
      `}</style>
      <HomeVariationA paletteClassName="ho--palette-3" />
    </>
  );
}
