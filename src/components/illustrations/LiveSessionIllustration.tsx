"use client";

export function LiveSessionIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background gradient circles */}
      <circle cx="120" cy="70" r="60" fill="white" fillOpacity="0.05" />
      <circle cx="120" cy="70" r="45" fill="white" fillOpacity="0.05" />

      {/* Main monitor/screen */}
      <rect x="70" y="25" width="100" height="65" rx="6" fill="white" fillOpacity="0.2" />
      <rect x="75" y="30" width="90" height="50" rx="3" fill="white" fillOpacity="0.15" />

      {/* Screen content - grid of mini students */}
      <rect x="80" y="35" width="18" height="14" rx="2" fill="#4ade80" fillOpacity="0.6" />
      <rect x="102" y="35" width="18" height="14" rx="2" fill="#4ade80" fillOpacity="0.6" />
      <rect x="124" y="35" width="18" height="14" rx="2" fill="#facc15" fillOpacity="0.6" />
      <rect x="146" y="35" width="14" height="14" rx="2" fill="#4ade80" fillOpacity="0.6" />

      <rect x="80" y="53" width="18" height="14" rx="2" fill="#4ade80" fillOpacity="0.6" />
      <rect x="102" y="53" width="18" height="14" rx="2" fill="#f87171" fillOpacity="0.6">
        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="1.5s" repeatCount="indefinite" />
      </rect>
      <rect x="124" y="53" width="18" height="14" rx="2" fill="#4ade80" fillOpacity="0.6" />
      <rect x="146" y="53" width="14" height="14" rx="2" fill="#4ade80" fillOpacity="0.6" />

      {/* Monitor stand */}
      <rect x="110" y="90" width="20" height="8" fill="white" fillOpacity="0.2" />
      <rect x="100" y="98" width="40" height="4" rx="2" fill="white" fillOpacity="0.2" />

      {/* Live indicator on monitor */}
      <circle cx="85" cy="28" r="3" fill="#ef4444">
        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* Teacher figure (left side) */}
      <circle cx="35" cy="55" r="12" fill="white" fillOpacity="0.3" />
      <circle cx="35" cy="50" r="6" fill="white" fillOpacity="0.5" />
      <path d="M25 70 Q35 62 45 70 L45 85 Q35 88 25 85 Z" fill="white" fillOpacity="0.3" />

      {/* Wifi/broadcast waves from teacher */}
      <path d="M50 45 Q55 50 50 55" stroke="white" strokeOpacity="0.4" strokeWidth="2" fill="none">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M55 40 Q65 50 55 60" stroke="white" strokeOpacity="0.3" strokeWidth="2" fill="none">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" begin="0.3s" />
      </path>

      {/* Connected students (right side) */}
      {/* Student 1 - Active */}
      <circle cx="200" cy="35" r="10" fill="white" fillOpacity="0.25" />
      <circle cx="200" cy="32" r="5" fill="white" fillOpacity="0.4" />
      <circle cx="208" cy="40" r="3" fill="#4ade80" />

      {/* Student 2 - Active */}
      <circle cx="210" cy="70" r="10" fill="white" fillOpacity="0.25" />
      <circle cx="210" cy="67" r="5" fill="white" fillOpacity="0.4" />
      <circle cx="218" cy="75" r="3" fill="#4ade80" />

      {/* Student 3 - Distracted */}
      <circle cx="200" cy="105" r="10" fill="white" fillOpacity="0.25" />
      <circle cx="200" cy="102" r="5" fill="white" fillOpacity="0.4" />
      <circle cx="208" cy="110" r="3" fill="#f87171">
        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
      </circle>

      {/* Connection lines */}
      <line x1="170" y1="55" x2="190" y2="35" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="170" y1="55" x2="200" y2="70" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="170" y1="55" x2="190" y2="105" stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />

      {/* Floating data points animation */}
      <circle cx="175" cy="45" r="2" fill="white" fillOpacity="0.5">
        <animate attributeName="cy" values="45;35;45" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="180" cy="75" r="2" fill="white" fillOpacity="0.4">
        <animate attributeName="cy" values="75;85;75" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
