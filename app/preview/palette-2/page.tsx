import HomeVariationA from "@/app/page-variation-a";

export const dynamic = "force-dynamic";

export default async function PreviewPaletteTwoPage() {
  return (
    <>
      <style>{`
        :root {
          --background: #F4FAFB;
          --foreground: #0F172A;
          --surface: #FFFFFF;
          --surface-strong: #0F172A;
          --accent: #00B8D9;
          --accent-hover: #009CB8;
          --accent-soft: #E7F8FC;
          --accent-rgb: 0, 184, 217;
          --accent-secondary: #FF7A59;
          --accent-secondary-rgb: 255, 122, 89;
          --text-on-primary: #FFFFFF;
          --line: #D6E5E8;
          --muted: #4F6171;
          --dark: #10202C;
          --dark-rgb: 16, 32, 44;
          --dark-surface: #162C3B;
          --dark-border: #2A4253;
          --dark-muted: #A8B8C6;
        }
      `}</style>
      <HomeVariationA paletteClassName="ho--palette-2" />
    </>
  );
}
