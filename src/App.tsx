import { BootScreen } from "./os/boot";
import { useBootSequence } from "./os/boot/use-boot-sequence";
import { Desktop } from "./os/desktop";

function App() {
  // Boot screen holds until the OS has actually finished mounting
  // (fonts + first paint + min display time), then fades out — so the
  // desktop appears fully assembled instead of popping in piece by piece.
  const { booting, leaving } = useBootSequence();

  return (
    <>
      {/* Always rendered: mounts behind the boot screen so it's ready on reveal. */}
      <Desktop />
      {booting && <BootScreen leaving={leaving} />}
    </>
  );
}

export default App;
