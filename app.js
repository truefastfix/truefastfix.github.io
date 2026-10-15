
(() => {
  "use strict";

  const experience = document.querySelector("[data-experience]");
  const form = document.querySelector("[data-form]");
  const input = document.querySelector("#ask-input");
  const conversation = document.querySelector("[data-conversation]");
  const welcome = document.querySelector("[data-welcome]");
  const year = document.querySelector("[data-year]");
  const heroImage = document.querySelector(".hero-media img");

  if (year) year.textContent = new Date().getFullYear();

  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9+#.\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const intents = [
    {
      id: "contact",
      phrases: ["contact", "email", "reach you", "reach skyfall", "hire you", "project inquiry", "talk to you", "get in touch"],
      answer: "For a project discussion, email developer.skyfall@skyfallcreations.com. Your default mail app will open when you use the Contact link at the top of the page."
    },
    {
      id: "support",
      phrases: ["support", "website support", "site problem", "website problem", "website issue", "help with this website"],
      answer: "For help with the Skyfall Creations website itself, email support@skyfallcreations.com."
    },
    {
      id: "capabilities",
      phrases: ["what can you build", "what do you build", "what can skyfall build", "capabilities", "services", "what do you do", "build for me"],
      answer: "Skyfall Creations can design and build websites, web applications, iPhone/iPad/macOS apps, Android apps, Windows/Linux desktop software, internal business tools, automation, APIs, databases, AI-assisted systems, dashboards, portals, and software that connects to sensors or small computers such as Raspberry Pi."
    },
    {
      id: "website",
      phrases: ["website", "web app", "web application", "web portal", "dashboard", "business website", "ecommerce", "e-commerce"],
      answer: "Yes. A web project can range from a fast public website to a database-backed application with authentication, dashboards, forms, role-based access, APIs, business logic, and deployment. The architecture should match what the site actually needs rather than forcing every project into the same stack."
    },
    {
      id: "apple",
      phrases: ["iphone", "ipad", "ios", "apple app", "mac app", "macos app", "swift", "swiftui", "xcode"],
      answer: "Yes. Skyfall Creations can design Apple-platform software for iPhone, iPad, and macOS. Native projects can use Swift and SwiftUI when native integration, performance, or long-term Apple-platform support makes that the right choice."
    },
    {
      id: "android",
      phrases: ["android", "android app", "google play", "kotlin", "java mobile", "google app"],
      answer: "Yes. Android applications can be built with Kotlin or Java, with architecture selected around device support, integrations, offline requirements, data handling, and maintainability."
    },
    {
      id: "desktop",
      phrases: ["desktop app", "desktop software", "windows app", "windows software", "linux app", "linux software", "mac desktop"],
      answer: "Yes. Desktop software can target macOS, Windows, or Linux. Depending on the requirements, it can be native or cross-platform, especially when the application needs local files, hardware access, networking, databases, or system integration."
    },
    {
      id: "automation",
      phrases: ["automation", "automate", "workflow", "repetitive", "integration", "integrate systems", "scheduled job", "scheduled process"],
      answer: "Yes. Automation can connect APIs, databases, files, notifications, sensors, or business systems to reduce repetitive work, move information reliably, trigger actions, and generate reports."
    },
    {
      id: "ai",
      phrases: ["ai", "artificial intelligence", "ai system", "chatbot", "assistant", "llm", "rag", "machine learning", "knowledge bot", "knowledge assistant"],
      answer: "Yes, when AI is useful to the actual problem. A production design can combine a model with approved documents or structured data, retrieval, permissions, API tools, rate limits, logging, and guardrails so the system is useful without pretending to know things it does not know."
    },
    {
      id: "prototype",
      phrases: ["prototype", "demo", "proof of concept", "proof-of-concept", "poc", "test my idea", "try my idea", "mockup first", "free demo"],
      answer: "Yes. For an appropriate small concept, Skyfall Creations may create an initial prototype or demonstration so you can evaluate the direction before deciding whether to proceed with a complete build. The feasibility depends on scope, integrations, and the amount of work required."
    },
    {
      id: "skills",
      phrases: ["skills", "languages", "programming languages", "tech stack", "technology", "what do you know", "what languages", "coding languages"],
      answer: "The current development range includes JavaScript, TypeScript, Python, Swift, SwiftUI, Kotlin, Java, PHP, HTML, CSS, SQL, C, C++, C#, Node.js, Linux, macOS, Windows, REST APIs, databases, networking, and automation tooling. The stack is chosen for the project rather than treated as a fixed menu."
    },
    {
      id: "backend",
      phrases: ["backend", "back end", "api", "rest api", "database", "sql", "server", "authentication", "login system"],
      answer: "Yes. Back-end work can include REST APIs, SQL databases, authentication, authorization, business rules, integrations, audit history, server-side services, and deployment. Security and data handling requirements influence the architecture."
    },
    {
      id: "hardware",
      phrases: ["raspberry pi", "sensor", "hardware", "embedded", "iot", "device", "microcontroller", "physical device"],
      answer: "Yes. A project can combine software with Raspberry Pi-class hardware, sensors, network devices, or other electronics when you need local monitoring, control, data collection, automation, or a custom dashboard."
    },
    {
      id: "current",
      phrases: ["current project", "working on now", "llcc", "lied lodge", "arbor day farm", "arbor day farms", "maintenance app", "maintenance website"],
      answer: "One current project is LLCC Team Maintenance, a facilities communication and operations web application for maintenance work at Arbor Day Farm / Lied Lodge. It is focused on structured daily logs, rounds, follow-ups, history, accountability, and clearer team handoffs."
    },
    {
      id: "process",
      phrases: ["process", "how do we start", "how to start", "development process", "what happens first", "project steps", "how does a project work"],
      answer: "A project should start with the real problem, users, required outcome, and constraints. Then we define the smallest useful version, choose an architecture, prototype uncertain parts, build in controlled increments, test the workflow, harden security and failure handling, and verify deployment."
    },
    {
      id: "security",
      phrases: ["security", "secure", "cybersecurity", "permissions", "authorization", "authentication", "privacy", "secrets"],
      answer: "Security is considered as part of the system design: authentication, authorization, least privilege, input validation, secrets handling, encrypted transport, logging, rate limiting, dependency risk, backup/recovery, and limiting unnecessary network exposure where applicable."
    },
    {
      id: "hosting",
      phrases: ["hosting", "host", "deployment", "deploy", "cloudflare", "aws", "google cloud", "home server", "self hosted", "self-hosted", "cloud"],
      answer: "Projects can be self-hosted or deployed to a cloud platform. The right choice depends on uptime requirements, public exposure, maintenance effort, backups, security, cost, traffic, and whether the system needs to stay available when a local connection or machine is down."
    },
    {
      id: "pricing",
      phrases: ["price", "pricing", "cost", "how much", "budget", "estimate"],
      answer: "A reliable price depends on scope, platforms, integrations, design depth, authentication, data sensitivity, testing, deployment, and support. The fastest way to get a useful estimate is to describe the outcome you need and the smallest version that would solve the problem."
    },
    {
      id: "timeline",
      phrases: ["timeline", "how long", "delivery time", "when can it be done", "schedule", "turnaround"],
      answer: "Timeline depends on scope and risk. A focused prototype can be relatively quick; a production system with authentication, integrations, multiple platforms, data migration, or complex workflows needs more design, testing, and verification."
    }
  ];

  const placeholderQuestions = [
    "Can you build an iPhone app for my business?",
    "What kinds of websites can you build?",
    "Can you prototype my idea first?",
    "Can you build an AI system with my company data?",
    "What programming languages do you use?",
    "Can you automate a manual workflow?",
    "How do I start a project with Skyfall?"
  ];

  let placeholderIndex = 0;
  let placeholderTimer = null;
  let hasInteracted = false;

  const words = (text) => normalize(text).split(" ").filter(Boolean);

  const scoreIntent = (question, intent) => {
    const q = normalize(question);
    const qWords = new Set(words(q));
    let score = 0;

    for (const phrase of intent.phrases) {
      const p = normalize(phrase);
      if (!p) continue;

      if (q === p) score += 18;
      else if (q.includes(p)) score += p.includes(" ") ? 10 : 6;

      for (const token of words(p)) {
        if (token.length >= 3 && qWords.has(token)) score += 1.5;
      }
    }

    return score;
  };

  const findAnswer = (question) => {
    const ranked = intents
      .map(intent => ({ intent, score: scoreIntent(question, intent) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score < 4) {
      return {
        text:
          "I do not have a reliable predefined answer for that yet. I can answer about websites, Apple or Android apps, desktop software, automation, AI, APIs, databases, prototypes, programming skills, security, hosting, pricing, the current LLCC Team Maintenance project, or how to contact Skyfall Creations.\n\nFor a specific idea, email developer.skyfall@skyfallcreations.com.",
        email: "developer.skyfall@skyfallcreations.com"
      };
    }

    const answer = best.intent.answer;
    const emailMatch = answer.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);

    return {
      text: answer,
      email: emailMatch ? emailMatch[0] : null
    };
  };

  const createTurn = (role, content, email = null) => {
    const node = document.createElement("article");
    node.className = `turn turn-${role}`;

    const label = document.createElement("span");
    label.className = "turn-label";
    label.textContent = role === "user" ? "You" : "Skyfall";

    const body = document.createElement("p");

    if (email && content.includes(email)) {
      const [before, after] = content.split(email);
      body.append(document.createTextNode(before));
      const link = document.createElement("a");
      link.href = `mailto:${email}`;
      link.textContent = email;
      body.append(link);
      body.append(document.createTextNode(after || ""));
    } else {
      body.textContent = content;
    }

    node.append(label, body);
    return node;
  };

  const createThinking = () => {
    const node = document.createElement("article");
    node.className = "turn turn-assistant";
    node.dataset.thinking = "true";

    const label = document.createElement("span");
    label.className = "turn-label";
    label.textContent = "Skyfall";

    const body = document.createElement("div");
    body.className = "thinking";
    body.setAttribute("aria-label", "Skyfall is answering");
    body.innerHTML = "<i></i><i></i><i></i>";

    node.append(label, body);
    return node;
  };

  const scrollConversation = () => {
    if (!conversation) return;
    requestAnimationFrame(() => {
      conversation.scrollTop = conversation.scrollHeight;
    });
  };

  const enterConversationMode = () => {
    if (!experience) return;
    if (!hasInteracted) {
      hasInteracted = true;
      experience.classList.add("is-active");
      if (welcome) welcome.hidden = false;
      stopPlaceholderRotation();
    }
  };

  const submitQuestion = (raw) => {
    const question = String(raw || "").trim().slice(0, 260);
    if (!question || !conversation) return;

    enterConversationMode();

    conversation.append(createTurn("user", question));
    const thinking = createThinking();
    conversation.append(thinking);
    scrollConversation();

    const result = findAnswer(question);

    window.setTimeout(() => {
      thinking.remove();
      conversation.append(createTurn("assistant", result.text, result.email));
      scrollConversation();
    }, 420);
  };

  const startPlaceholderRotation = () => {
    if (!input || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    placeholderTimer = window.setInterval(() => {
      if (document.activeElement === input || input.value || hasInteracted) return;
      placeholderIndex = (placeholderIndex + 1) % placeholderQuestions.length;
      input.setAttribute("placeholder", placeholderQuestions[placeholderIndex]);
    }, 3300);
  };

  const stopPlaceholderRotation = () => {
    if (placeholderTimer) {
      window.clearInterval(placeholderTimer);
      placeholderTimer = null;
    }
  };

  if (form && input) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const question = input.value;
      if (!question.trim()) {
        input.focus();
        return;
      }

      input.value = "";
      submitQuestion(question);
      input.focus();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && input.value) {
        input.value = "";
      }
    });

    input.addEventListener("focus", () => {
      if (!hasInteracted) {
        input.setAttribute("placeholder", "Ask about a project, platform, skill, or idea…");
      }
    });

    input.addEventListener("blur", () => {
      if (!hasInteracted && !input.value) {
        input.setAttribute("placeholder", placeholderQuestions[placeholderIndex]);
      }
    });
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroImage && !reducedMotion && window.matchMedia("(pointer:fine)").matches) {
    window.addEventListener("pointermove", (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * -10;
      const y = (event.clientY / window.innerHeight - 0.5) * -7;
      heroImage.style.setProperty("--px", `${x.toFixed(2)}px`);
      heroImage.style.setProperty("--py", `${y.toFixed(2)}px`);
    }, { passive: true });
  }

  startPlaceholderRotation();
})();
