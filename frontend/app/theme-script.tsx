// Inline script to set theme before React hydrates
// This prevents flash of wrong theme
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var settings = localStorage.getItem('sedi-reading-settings');
              var theme = 'light';
              if (settings) {
                var parsed = JSON.parse(settings);
                theme = parsed.theme || 'light';
              } else {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              document.documentElement.classList.add(theme);
            } catch (e) {
              document.documentElement.classList.add('light');
            }
          })();
        `,
      }}
    />
  );
}
