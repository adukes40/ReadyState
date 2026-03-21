import { useState, useEffect } from "react";

const TAGLINES = [
  "Every coffee bought extends my will to live by approximately 4 hours.",
  "Scientifically proven: coffee makes code work. Probably.",
  "One coffee = one bug fixed. No promises on which bug.",
  "Your hardware works. I, however, am barely holding it together.",
  "Donating won't fix your hardware. It will fix my mood though.",
  "A coffee a day keeps the feature freeze away. Allegedly.",
  "Caffeine intake directly correlates to uptime. This is not a joke.",
  "Studies show developers who get coffee ship faster. I made that up. Please buy coffee.",
  "One donation = one less passive aggressive comment in the source code.",
  "Every dollar spent here prevents exactly one dramatic GitHub issue closure.",
  "I could have slept. I built this instead. No regrets. Many regrets.",
  "Somewhere a developer is staring at a screen. It's me. It's always me.",
  "Running on fumes and a deeply questionable life philosophy.",
  "This app has no bugs. The developer has several.",
  "Built this for free. Therapy is not.",
  "I am fine. The app is fine. Everything is fine. Please send coffee.",
  "At some point I made choices that led here. Coffee helps me not think about that.",
  "The code works. I do not know why. Neither does the developer.",
  "Questioning my life decisions since the first commit. Coffee helps.",
  "I have seen things in this codebase that cannot be unseen. Coffee is the only cure.",
  "The pixels on your screen were arranged by a human who needs caffeine.",
  "This button was designed at 2am. The coffee is for next time.",
  "Warning: developer may become increasingly unhinged without support.",
  "Please. I'm begging. Not emotionally. Just financially.",
  "A coffee won't fix me but it's worth a shot.",
  "I asked the rubber duck. It said buy me a coffee.",
  "The voices in my head all agree: buy me a coffee.",
  "Technically this is cheaper than my therapy copay.",
  "I once fixed a bug by buying coffee. Correlation? Causation? Yes.",
  "My doctor said reduce stress. You can help with that.",
  "You used the tool. The tool costs money to exist. You do the math.",
  "Free as in beer, except I need you to buy the beer.",
  "Open source. Closed wallet. Send help.",
  "Bandwidth isn't free. Neither is my sanity.",
  "The server costs money. The developer costs coffee. Both are running low.",
  "If you don't buy me a coffee the laws of thermodynamics win.",
  "Entropy increases. Coffee decreases. Only you can fix this.",
  "This tool obeys the laws of physics. Those are expensive.",
  "Conservation of energy: yours in, mine out. Refill required.",
  "I am a perpetual motion machine that runs on coffee. Physics disagrees but here we are.",
  "Buy me a coffee or I'll add a loading spinner that never stops. I won't. But I could.",
  "No coffee means I name the next variable after my frustrations. You don't want that.",
  "Without coffee I start writing comments in all caps. We've been warned.",
  "Uncaffeinated developers write nested ternaries. Think about that.",
  "I'm one bad morning away from rewriting this in PHP. Your move.",
  "I have been awake for an unclear number of hours and the tool still works somehow.",
  "At this point the coffee isn't a want. It's load bearing.",
  "The commit history tells a story. It is not a happy one. Coffee helps.",
  "I dreamed in CSS last night. Send coffee. Immediately.",
  "This runs on caffeine, chaos, and the audacity to ship anyway.",
];

export default function KofiButton() {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [tagline, setTagline] = useState("");

  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  }, []);

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 300);
    window.open("https://ko-fi.com/austindukes", "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={hovered ? "animate-shimmer" : ""}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "7px 12px",
        background: hovered ? "#1a1a1a" : "transparent",
        border: `1px solid ${hovered ? "rgba(64,224,208,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "10px",
        cursor: "pointer",
        overflow: "hidden",
        transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        outline: "none",
        width: "100%",
        scale: clicked ? "0.99" : "1",
        fontFamily: "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace",
        textAlign: "left",
      }}
    >
      {/* Coffee icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{
          transition: "filter 0.2s ease",
          filter: hovered ? "drop-shadow(0 0 3px rgba(64,224,208,0.6))" : "none",
        }}>
          <path d="M8 3 Q8.5 1.5 8 0M11 3 Q11.5 1.5 11 0M14 3 Q14.5 1.5 14 0"
            stroke={hovered ? "#40E0D0" : "rgba(64,224,208,0.3)"} strokeWidth="1.2" strokeLinecap="round"
            style={{ transition: "stroke 0.2s ease" }} />
          <path d="M5 6h14l-2 12H7L5 6z"
            stroke={hovered ? "#40E0D0" : "rgba(64,224,208,0.3)"} strokeWidth="1.5"
            fill={hovered ? "rgba(64,224,208,0.08)" : "transparent"} style={{ transition: "all 0.2s ease" }} />
          <path d="M19 9h1.5a2 2 0 0 1 0 4H19"
            stroke={hovered ? "#40E0D0" : "rgba(64,224,208,0.3)"} strokeWidth="1.5" fill="none"
            style={{ transition: "stroke 0.2s ease" }} />
          <path d="M10.5 11.5 Q11 10.5 12 11.5 Q13 10.5 13.5 11.5 Q13.5 13 12 14 Q10.5 13 10.5 11.5z"
            fill={hovered ? "#40E0D0" : "rgba(64,224,208,0.25)"} style={{ transition: "fill 0.2s ease" }} />
        </svg>
        <span style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: hovered ? "#40E0D0" : "rgba(255,255,255,0.25)",
          transition: "color 0.2s ease",
          whiteSpace: "nowrap",
        }}>
          Donate
        </span>
        <span style={{
          fontSize: "10px",
          color: hovered ? "rgba(64,224,208,0.3)" : "rgba(255,255,255,0.1)",
          transition: "color 0.2s ease",
        }}>|</span>
      </div>

      {/* Tagline */}
      <span style={{
        fontSize: "10px",
        color: hovered ? "rgba(64,224,208,0.8)" : "rgba(255,255,255,0.2)",
        letterSpacing: "0.02em",
        fontStyle: "italic",
        transition: "color 0.3s ease",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        flex: 1,
        minWidth: 0,
      }}>
        {tagline}
      </span>

      {/* Arrow */}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{
        flexShrink: 0,
        opacity: hovered ? 1 : 0,
        transform: hovered ? "translateX(0)" : "translateX(-4px)",
        transition: "all 0.2s ease",
      }}>
        <path d="M5 12h14M13 6l6 6-6 6" stroke="#40E0D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
