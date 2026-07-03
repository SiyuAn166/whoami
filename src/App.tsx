import { useEffect } from 'react';
import { Desktop } from './os/desktop/Desktop';

function App() {
    // Prevent the default context menu from appearing anywhere in the app.
    useEffect(() => {
        const block = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', block);
        return () => document.removeEventListener('contextmenu', block);
    }, []);

    return <Desktop />;
}

export default App;
