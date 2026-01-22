// Inline script to set theme before React hydrates
// This prevents flash of wrong theme
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              const theme = localStorage.getItem('theme') ||
                (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              document.documentElement.classList.add(theme);
            } catch (e) {}
          })();
        `,
      }}
    />
  );
}
