# ToyCommander

A Next.js PWA for wirelessly controlling Bluetooth-connected intimate devices. Supports local control, real-time remote (partner) control, vibration patterns, and audio-reactive mode.

## Features

- **Local control** — direct device control from your own browser
- **Remote sessions** — invite a partner to control your device in real time via a shareable link (powered by Firebase RTDB)
- **Vibration patterns** — built-in patterns including pulse, waves, heartbeat, surge, and more
- **Audio mode** — device responds to microphone input
- **PWA** — installable on mobile and desktop

## Tech stack

- [Next.js](https://nextjs.org/) 15
- [Buttplug.io](https://buttplug.io/) for Bluetooth device communication
- [Firebase Realtime Database](https://firebase.google.com/products/realtime-database) for remote session sync
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/tropicalazure/toycommander.git
cd toycommander
npm install
```

### 2. Configure Firebase

Copy the example env file and fill in your Firebase project credentials:

```bash
cp .env.example .env.local
```

You can find your config values in the [Firebase console](https://console.firebase.google.com/) under **Project Settings → General → Your apps → SDK setup and configuration**.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- Bluetooth device communication requires a browser that supports the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) (Chrome/Edge on desktop; Chrome on Android).
- Remote sessions require a Firebase project with Realtime Database enabled. Secure your RTDB rules before deploying.
