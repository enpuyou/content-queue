import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    // ImageResponse JSX element
    <div
      style={{
        fontSize: 24,
        background: "transparent",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "black", // Default to black for favicon
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ width: "32px", height: "32px" }}
      >
        <path
          d="M52,3 C71,0 86,11 93,26 C101,42 98,58 92,71 C84,86 70,97 53,98 C37,99 22,92 13,79 C4,66 0,49 5,34 C10,18 26,5 42,2 C46,1 49,2 52,3Z"
          fill="currentColor"
        />
      </svg>
    </div>,
    // ImageResponse options
    {
      ...size,
    },
  );
}
