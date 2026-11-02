# Product Requirements Document (PRD): Robot DJ Music Player

## 1. Product Overview
**Name:** Robot DJ (Working Title)
**Concept:** A highly minimalist, visually engaging web-based music player by param20h. The core feature is a cool, futuristic animated robot acting as a DJ. The platform streams a hardcoded playlist directly from YouTube in an "audio-only" format, utilizing a randomized shuffle playback system rather than serial order.
**Target Audience:** Users looking for a seamless, continuous ambient/music experience with a visually appealing but non-distracting interface.

## 2. Goals & Objectives
*   **Visual Engagement:** Deliver a futuristic, minimal aesthetic centered around a high-quality robot animation that reacts to the music state.
*   **Audio-First Experience:** Ensure a strictly headless audio experience by completely hiding the YouTube video player.
*   **Zero-Friction Playback:** Provide a shuffled, continuous stream of music from a statically embedded playlist, requiring minimal user interaction.

## 3. Key Features & Requirements

### 3.1. User Interface (UI) & Design
*   **Minimalist Dark Theme:** The UI will feature a sleek, modern dark mode design, keeping visual clutter to an absolute minimum. Only essential controls will be visible.
*   **Futuristic Robot DJ Animation:** 
    *   A central, animated robot character interacting with a DJ deck.
    *   The design must be "cool and futuristic" yet align with the overall minimal aesthetic (e.g., clean geometric shapes, neon/cyberpunk glowing accents).
    *   **State-Linked Animation:** The animation must reflect the playback state (e.g., spinning records, head-bumping, or glowing when `Playing`; static or dimmed when `Paused`).
*   **Track Metadata Display:** 
    *   **Small Thumbnails:** Display only small, unobtrusive thumbnail images fetched from the currently playing YouTube track. No large banners or video displays.
    *   **Text:** Clean typography displaying the Track Title and Artist/Channel Name.

### 3.2. Audio Playback & YouTube Integration
*   **Headless Audio Engine (No Video):** The application will use the YouTube IFrame API to play music, but the video element itself must be entirely hidden via CSS (e.g., off-screen rendering or zero dimensions) so the user only perceives an audio player.
*   **Static Playlist Embedding:** A specific array of YouTube Video IDs or a single YouTube Playlist ID will be hardcoded directly into the application logic. 
*   **Automatic Shuffle Logic:** 
    *   The player must *never* play tracks in their default serial order.
    *   Upon application initialization, the static playlist must be algorithmically randomized (e.g., using a Fisher-Yates shuffle) before playback begins.

### 3.3. Player Controls
*   **Play / Pause:** Central toggle button.
*   **Skip / Next Track:** Allows the user to jump to the next track in the randomized queue.
*   **Volume Control:** A minimalist slider or toggle for mute/unmute and volume adjustment.
*   **Autoplay Handling:** A localized "Start" overlay or button to initiate the first playback, bypassing modern browser restrictions on unmuted autoplay.

## 4. Technical Specifications

### 4.1. Proposed Technology Stack
*   **Frontend Framework:** React JS (Mandatory based on constraints).
*   **Styling:** Tailwind CSS or styled-components for implementing the minimalist dark theme and layout.
*   **Animation Framework:** 
    *   *Option A (Programmatic):* Framer Motion (Excellent for React, minimal geometric animations, and state-based transitions).
    *   *Option B (Asset-based):* Lottie (lottie-react) or Rive (rive-react) if importing a complex, pre-designed vector robot animation from an external design tool.
*   **Audio Provider:** YouTube IFrame Player API.

### 4.2. State Management Requirements
*   **Playback State:** Track whether the player is currently playing, paused, buffering, or ended. This state directly controls the Robot DJ animation.
*   **Queue Management:** Manage the array of shuffled track IDs and track the current index.
*   **Metadata State:** Store and update the current track's title, author, and small thumbnail URL dynamically as tracks change.

## 5. Out of Scope (For Initial Release)
*   User login, accounts, or profile management.
*   Dynamic playlist creation or allowing users to input their own YouTube links.
*   Visualizers that require raw audio frequency data (due to YouTube API CORS restrictions).
*   Video playback of any kind.

## 6. Risks & Mitigations
*   **Browser Autoplay Policies:** Browsers strictly block audio from playing without prior user interaction. 
    *   *Solution:* The UI must include a prominent initial "Start Playing" interaction state before revealing the full minimal UI and starting the YouTube engine.
*   **YouTube Background Play Restrictions:** Hiding the iframe via `display: none` can sometimes cause the YouTube API to halt playback to save resources.
    *   *Solution:* Use CSS visually hidden techniques (e.g., `width: 0; height: 0; position: absolute; opacity: 0`) rather than removing it from the render tree.