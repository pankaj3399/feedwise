export function CardGlyph({ glyph, color }: { glyph: string; color: string }) {
  const stroke = { stroke: color, strokeWidth: 1.1, fill: "none" as const };
  return (
    <svg
      viewBox="0 0 240 240"
      className="pointer-events-none absolute -right-20 -top-16 size-[300px] opacity-[0.14]"
      aria-hidden
    >
      {glyph === "network" ? (
        <g {...stroke}>
          <circle cx="60" cy="70" r="7" />
          <circle cx="180" cy="52" r="7" />
          <circle cx="142" cy="130" r="7" />
          <circle cx="62" cy="170" r="7" />
          <circle cx="196" cy="188" r="7" />
          <path d="M67 73 135 125M174 58 148 123M137 136 68 165M148 136 189 181M66 164 188 185" />
          <circle cx="120" cy="120" r="86" strokeDasharray="2 7" />
          <circle cx="120" cy="120" r="112" strokeDasharray="1 9" />
        </g>
      ) : null}
      {glyph === "graph" ? (
        <g {...stroke}>
          <path d="M36 190h170M36 190V44" />
          <path d="M58 170v-34M84 170v-58M110 170v-42M136 170v-82M162 170v-62M188 170v-104" />
          <path d="M52 126c22-2 34-30 56-34s30 22 52-10 28-38 40-42" strokeDasharray="3 5" />
        </g>
      ) : null}
      {glyph === "cpu" ? (
        <g {...stroke}>
          <rect x="58" y="58" width="124" height="124" rx="16" />
          <rect x="82" y="82" width="76" height="76" rx="10" />
          <path d="M120 30v28M120 182v28M30 120h28M182 120h28M70 38v20M170 38v20M70 182v20M170 182v20M38 70h20M38 170h20M182 70h20M182 170h20" />
          <circle cx="120" cy="120" r="14" />
        </g>
      ) : null}
      {glyph === "spark" ? (
        <g {...stroke}>
          <path d="M120 24v64M120 152v64M24 120h64M152 120h64M52 52l42 42M146 146l42 42M188 52l-42 42M94 146l-42 42" />
          <circle cx="120" cy="120" r="24" />
          <circle cx="120" cy="120" r="66" strokeDasharray="2 8" />
          <circle cx="120" cy="120" r="98" strokeDasharray="1 10" />
        </g>
      ) : null}
      {glyph === "arrow" ? (
        <g {...stroke}>
          <path d="M120 206V50M120 50l-42 42M120 50l42 42" />
          <path d="M38 196h164" />
          <path d="M52 146c22-10 38-32 68-32s46 22 68 32" strokeDasharray="3 6" />
          <circle cx="120" cy="38" r="7" />
        </g>
      ) : null}
    </svg>
  );
}
