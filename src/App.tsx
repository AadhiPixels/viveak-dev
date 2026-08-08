import { useCallback, useState } from "react";
import { ModeProvider } from "./mode";
import { ToastProvider, useToast } from "./toast";
import { useKonami } from "./hooks/useKonami";
import { Header } from "./components/Header";
import { CommandPalette } from "./components/CommandPalette";
import { Hero } from "./sections/Hero";
import { Ticker } from "./sections/Ticker";
import { Experience } from "./sections/Experience";
import { Simulator } from "./sections/Simulator";
import { Products } from "./sections/Products";
import { Skills } from "./sections/Skills";
import { Contact } from "./sections/Contact";

function Site() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toast = useToast();

  useKonami(
    useCallback(() => {
      document.documentElement.style.setProperty("--accent", "#ff2d95");
      toast("🎮 Konami accepted. Hot-pink accent unlocked — this is your site now.");
    }, [toast])
  );

  return (
    <>
      <div className="stars" aria-hidden="true" />
      <Header openPalette={() => setPaletteOpen(true)} />
      <main>
        <Hero />
        <Ticker />
        <Experience />
        <Simulator />
        <Products />
        <Skills />
        <Contact />
      </main>
      <footer className="footer">
        <div className="wrap">
          <span>© {new Date().getFullYear()} Viveak Vadivelkarasan</span>
          <span>
            React + TypeScript + Vite, no template ·{" "}
            <a href="https://github.com/AadhiPixels/viveak-dev" target="_blank" rel="noopener">
              source
            </a>{" "}
            · deployed on Vercel
          </span>
        </div>
      </footer>
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </>
  );
}

export default function App() {
  return (
    <ModeProvider>
      <ToastProvider>
        <Site />
      </ToastProvider>
    </ModeProvider>
  );
}
