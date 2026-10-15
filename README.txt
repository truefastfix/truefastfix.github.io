Skyfall Creations — Conversational Website v2
================================================

Design direction
----------------
This version is intentionally AI-first and immersive rather than a traditional scrolling
portfolio. The entire first experience remains in one realistic office scene. Visitors type
a question into the main field and the page transitions into a conversation without loading
a different page.

The interaction is inspired by the conversational-portfolio pattern, but the visual design,
office scene, branding, content, code, and response system are original to Skyfall Creations.

Primary contact
---------------
developer.skyfall@skyfallcreations.com

Website support
---------------
support@skyfallcreations.com

What is included
----------------
- Photorealistic original office scene with Brian seated with a MacBook and a black lab
- Skyfall visual branding
- Full-screen immersive landing experience
- One AI-style ask/search field instead of CTA button grids
- Enter-to-submit conversation flow
- Animated transition from introduction to conversation mode
- Curated deterministic knowledge base that refuses to invent unsupported answers
- Rotating example questions in the input placeholder (no suggestion buttons)
- Grounded answers covering:
  * websites and web apps
  * Apple apps
  * Android apps
  * desktop software
  * automation
  * AI-assisted systems
  * APIs/databases/back-end
  * hardware/software integration
  * security
  * hosting/deployment
  * pricing/timeline
  * prototypes
  * current LLCC Team Maintenance project
  * skills
  * contact/support
- Responsive desktop/tablet/mobile behavior
- Reduced-motion accessibility support
- Keyboard accessible input/contact links
- No trackers
- No cookies
- No analytics
- No external JavaScript libraries
- No API keys
- No public admin/debug/backend links

Important
---------
The current "AI" interaction is deliberately local and deterministic. It behaves like a
conversational portfolio but does not call an LLM yet. This is the safest design-stage
implementation because it cannot hallucinate project history.

When the design is approved, the exact same front end can be connected to a PHP or Node
server endpoint and an AI model using retrieval from an approved Skyfall knowledge base.

Local preview
-------------
macOS / Linux:
  cd SkyfallCreations_Conversational_v2
  python3 -m http.server 8080
  open http://127.0.0.1:8080

Windows:
  cd SkyfallCreations_Conversational_v2
  py -m http.server 8080

Production hosting
------------------
This static version works with nginx, Apache, Cloudflare Pages, AWS, Google Cloud,
or a home server. No PHP is required until a server-side AI endpoint is added.
