# **App Name**: Aura Commander

## Core Features:

- Toy Connection via WebBluetooth: Connect to local toys via WebBluetooth using Buttplug and WASM, loading modules from CDN to avoid bundling issues.
- Session Initialization: Start a new session and generate a unique session ID using UUID.
- Realtime Vibration Control: Write vibration power values (0-1) to Firebase Realtime Database and trigger device vibration accordingly. The device should follow the external source's changes without requiring further interaction.
- Remote Control: Allow external source to adjust the target device by writing to the shared session.
- Session Sharing: Display a shareable link for the controller view, allowing others to control the toy.

## Style Guidelines:

- Primary color: Dark charcoal gray (#333333) for a sleek, modern feel.
- Background color: Black (#000000) to emphasize content and reduce eye strain in low-light environments.
- Accent color 1: Magenta (#FF00FF) for interactive elements and highlights, providing a vibrant contrast.
- Accent color 2: Lilac (#C8A2C8) for secondary interactive elements and subtle highlights, offering a softer contrast.
- Accent color 3: Pale powder blue (#B0E2FF) for subtle UI elements and accents.
- Body and headline font: 'Roboto', a geometric sans-serif font, to give a modern and precise feel. Use a light font weight for readability against the dark background.
- Use minimalistic and modern icons, highlighting them with magenta or lilac when active or interactive. Ensure icons are clearly visible against the dark background.
- Create a clean and intuitive layout, optimizing for ease of use and clear visual hierarchy. Use spacing and contrast to guide the user's eye.
- Incorporate subtle animations and transitions to provide engaging feedback for user interactions, highlighting them with magenta or lilac. Ensure animations are smooth and responsive.