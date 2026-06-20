import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; margin: 0; padding: 0; background: #111; }
              body {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }
              #root {
                width: 390px;
                height: 844px;
                max-height: 100vh;
                overflow: hidden;
                position: relative;
                border-radius: 40px;
                box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 32px 100px rgba(0,0,0,0.8);
                background: #000;
              }
              @media (max-height: 860px) {
                #root { height: 100vh; border-radius: 0; box-shadow: none; }
              }
              @media (max-width: 420px) {
                body { background: #000; align-items: flex-start; }
                #root { width: 100vw; height: 100vh; border-radius: 0; box-shadow: none; }
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
