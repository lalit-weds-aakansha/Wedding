/**
 * ============================================================
 *  WEDDING CONFIGURATION — edit this file to personalise the invitation.
 * ============================================================
 *
 *  Everything below is SAMPLE / DEMO CONTENT. Replace names, dates, venues and
 *  photos with your own. You do not need to touch any other file.
 *
 *  Dates: ISO format WITH the venue's UTC offset, e.g. "2026-12-25T11:00:00+05:30"
 *  (11 AM India time). The countdown and calendar entries are then correct for
 *  guests in any time zone.
 *
 *  Images: put files in /public/images and reference them as "/images/name.jpg".
 *  Leave an image "" to show a decorative floral placeholder instead.
 */

export type DressSwatch = string; // any CSS colour

export type Venue = {
  name: string;
  address: string;
  /** Optional: exact Google Maps link (e.g. a shared pin). Auto-generated from name + address otherwise. */
  mapsUrl?: string;
  /** Optional: short area shown on event cards, e.g. "Trombay" */
  area?: string;
};

export type WeddingEvent = {
  /** Used in the URL: yoursite.com/#event-haldi */
  id: string;
  title: string;
  start: string; // ISO with offset
  end: string; // ISO with offset
  venue: Venue;
  image?: string;
  /** Small illustration shown on the event card ("/images/sunset/icon-haldi.jpg") */
  icon?: string;
  description?: string;
  dressCode?: { label: string; swatches?: DressSwatch[] };
  /** Decorative illustration used when `image` is empty */
  motif: "rings" | "turmeric" | "henna" | "music" | "fire" | "lotus";
};

export type Photo = { src: string; alt: string; caption?: string; orientation: "portrait" | "landscape" };

export type Milestone = { title: string; subtitle: string; year: string; icon: "pin" | "coffee" | "ring" | "heart" | "plane" | "star" };

export type TravelItem = { icon: "hotel" | "parking" | "car" | "plane" | "train"; title: string; text: string };

const trombayHome: Venue = {
  name: "Dattanagar, Near Datta Mandir",
  area: "Trombay",
  address: "2WPX+P38, VN Purav Rd, Datta Nagar, Dhobi Ghat, Trombay, Mumbai, Maharashtra 400088",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=2WPX%2BP38%20Trombay%2C%20Mumbai",
};

const abhinavMandir: Venue = {
  name: "Abhinav Dnyan Mandir School",
  area: "Trombay",
  address: "Datta Nagar, Dhobighat, Sion-Trombay Road, Trombay, Mumbai 400079",
  mapsUrl: "https://www.google.com/maps/place/Abhinav+Dnyan+Mandir+School/@19.035518,72.946865,17z",
};

export const wedding = {
  /** Shows a small "Sample invitation" ribbon. Set to false once your real details are in. */
  isDemo: true,

  couple: {
    bride: "Aakansha",
    groom: "Lalit",
    /** Order the names appear in: "groom-first" or "bride-first" */
    order: "groom-first" as "groom-first" | "bride-first",
    monogram: { first: "L", second: "A" },
    /** Hero image ("/images/couple.jpg"). Empty = illustrated placeholder. */
    heroPhoto: "",
  },

  /** Scenery pictures (SAMPLE images — replace with your own files in /public/images). */
  images: {
    hero: "/images/sunset/hero.jpg", // wide sunset scene behind the names
    couple: "/images/couple/invitation.jpg", // photo on the invitation card
    couplePosition: "50% 40%", // crop position: keeps faces in frame
    thanks: "/images/sunset/thanks.jpg", // banner at the very end
  },

  /**
   * Save-the-Date scratch card shown first. Set `enabled: false` to open straight on the invitation.
   * The photo is a PLACEHOLDER (an illustration): replace the file or the path with your own couple photo.
   */
  saveTheDate: {
    enabled: false,
    photo: "/images/save-the-date/couple-photo.jpg",
    /** CSS object-position for the photo crop, e.g. "50% 30%" keeps faces higher up */
    photoPosition: "50% 35%",
    /** Share of the card that must be scratched before it finishes revealing by itself (0.2 – 0.9) */
    scratchThreshold: 0.5,
    /** Optional envelope that opens before the card appears */
    envelope: { enabled: false },
  },

  /** Opening experience. `story`: the cinematic scene-by-scene opening (mountain road, card, garden, one scene per event). Set false for just the painted hero. */
  opening: {
    story: true,
    /** Scene artwork for the event scenes: "frames" = the picture files in public/images/story/, "painted" = the built-in painted scenes. */
    sceneArt: "frames" as "frames" | "painted",
    /**
     * false = the animations always play, even when a visitor's device has "reduce motion" switched on (many people have it on without knowing).
     * true = honour that setting: visitors who asked for less motion get still scenes with soft fades. Accessibility guidance recommends true.
     */
    respectReducedMotion: false,
  },

  weddingDate: "2026-12-12T17:45:00+05:30",
  timezone: "Asia/Kolkata",

  wording: {
    coverTop: "Together with our families",
    coverInvite: "We cordially invite you to the wedding of",
    heroTitle: "Our Wedding",
    heroQuote: "Two Hearts, One Journey",
    heroMessage: "With the blessings of our families,\nwe invite you to be a part of our special day.",
    familyBlessing: "With the blessings of",
    familyInvite: "We are delighted to invite you to the wedding ceremony of our children",
    familyPresence: "Your presence will make our celebration more special.",
    eventsSubtitle: "Join us for the celebrations",
    storySubtitle: "How it all began",
    gallerySubtitle: "Moments we cherish",
    venueSubtitle: "We can't wait to celebrate with you!",
    inviteIntro: "With the blessings of our families,\nwe cordially invite you to the wedding ceremony of our children",
    signOff: "With love,",
    signature: "The Panbude & Jaiswal Families",
    story: "Two souls, one beautiful journey.\nAs we begin a new chapter of love,\ntogether with your blessings and presence.",
    thankYouTitle: "With Love & Gratitude",
    thankYouMessage: "Thank you for being a part of our journey.\nYour presence means the world to us.",
  },

  /** Religious greeting shown in the family section. Set `text: ""` to hide. */
  greeting: { text: "॥ शुभम भवतु ॥", translation: "May all be auspicious" },

  family: {
    bride: { title: "Bride's Parents", parents: "Mr. & Mrs. Jaiswal", detail: "Dilip Jaiswal & Archana Jaiswal", grandparents: "" },
    groom: { title: "Groom's Parents", parents: "Mr. & Mrs. Panbude", detail: "Deepak Panbude & Sarla Panbude", grandparents: "" },
  },

  /** Add or remove freely — any number of events is supported. They are shown in date order. */
  events: [
    {
      id: "haldi",
      title: "Haldi",
      start: "2026-12-11T19:00:00+05:30",
      end: "2026-12-11T22:00:00+05:30",
      venue: trombayHome,
      motif: "turmeric",
      icon: "/images/sunset/icon-haldi.jpg",
      description: "Turmeric, laughter and blessings with family.",
      dressCode: { label: "Shades of Yellow", swatches: ["#f2c94c", "#f6dd8a", "#e8a33d", "#fff2c2"] },
    },
    {
      id: "mehendi",
      title: "Mehendi",
      start: "2026-12-10T16:00:00+05:30",
      end: "2026-12-10T19:00:00+05:30",
      venue: trombayHome,
      motif: "henna",
      icon: "/images/sunset/icon-mehendi.jpg",
      description: "Henna, music and stories in the garden.",
      dressCode: { label: "Greens & Florals", swatches: ["#7a8f5c", "#a9bf8a", "#d9a5a8", "#efe2c8"] },
    },
    {
      id: "sangeet",
      title: "Sangeet",
      start: "2026-12-10T19:00:00+05:30",
      end: "2026-12-10T23:30:00+05:30",
      venue: trombayHome,
      motif: "music",
      icon: "/images/sunset/icon-lanterns.jpg",
      description: "Dance performances by both families — bring your best moves.",
      dressCode: { label: "Indo-Western Glam", swatches: ["#6b2d5c", "#c46b8c", "#d4af37", "#2f2a4a"] },
    },
    {
      id: "wedding",
      title: "Wedding Ceremony",
      start: "2026-12-12T17:45:00+05:30",
      end: "2026-12-12T22:00:00+05:30",
      venue: abhinavMandir,
      motif: "fire",
      icon: "/images/sunset/icon-wedding.jpg",
      description: "The pheras at the auspicious muhurat, followed by dinner.",
      dressCode: { label: "Traditional Indian Attire", swatches: ["#9b2c2c", "#c9a66b", "#e8c9a0", "#7a4a2a"] },
    },
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) as WeddingEvent[],

  /** Optional — set `enabled: false` to remove the section and its menu link. */
  story: {
    enabled: true,
    label: "Our Story",
    title: "Two Souls, One Heart",
    /** Sample text: replace with your own story. */
    text: "Some love stories begin with a glance, others with a friendship that quietly grew into something more. Ours has become a promise, made with the blessings of our families. We are so grateful to share the next chapter with you.",
    /** PLACEHOLDER illustration: replace with your own photo (public/images/...) */
    photo: "/images/couple/story.jpg",
    photoPosition: "42% 50%",
    milestones: [] as Milestone[],
  },

  /** Optional. Empty `src` shows an elegant placeholder tile. */
  gallery: {
    enabled: false,
    /** How many photos show before "View All Photos" */
    previewCount: 5,
    photos: [
      { src: "", alt: "The couple smiling together", caption: "Us", orientation: "portrait" },
      { src: "", alt: "Walking on the beach at sunset", caption: "Goa, 2023", orientation: "portrait" },
      { src: "", alt: "Bridal portrait", caption: "The bride", orientation: "portrait" },
      { src: "", alt: "Black and white candid", caption: "Candid", orientation: "portrait" },
      { src: "", alt: "The couple in the mountains", caption: "Himachal, 2024", orientation: "landscape" },
      { src: "", alt: "Engagement celebration", caption: "The roka", orientation: "landscape" },
      { src: "", alt: "Holding hands", caption: "Forever", orientation: "portrait" },
    ] as Photo[],
  },

  /** The main venue shown in "Venue & Travel" (events can still each have their own venue). */
  venue: { ...abhinavMandir, image: "/images/sunset/school.jpg" },

  /** Optional travel notes. Set `enabled: false` to hide. */
  travel: {
    enabled: true,
    items: [
      { icon: "parking", title: "Parking", text: "On-site parking available" },
    ] as TravelItem[],
  },

  rsvp: {
    enabled: true,
    respondBy: "2026-11-15",
    contact: "phone" as "phone" | "email",
    phoneCountryCode: "+91",
    maxGuests: 6,
    askDietary: true,
    dietaryOptions: ["Vegetarian", "Jain", "Vegan", "Non-vegetarian", "No preference"],
  },

  /**
   * Optional wedding-gift QR (UPI). `qr` is the picture guests scan; `upiLink` is the same code's payee link, used for the
   * "Pay with UPI app" button on phones and the "Copy UPI ID" button. Set `enabled: false` to remove the whole section.
   */
  gift: {
    enabled: true,
    qr: "/images/gift/upi-qr.png",
    upiLink: "upi://pay?pa=8308776820%40upi&pn=LALIT+DEEPAK+PANBUDE",
    /** Show the payee name from the QR, so guests can check it matches before paying */
    showPayeeName: true,
  },

  /**
   * Guest photo delivery (needs the photo server: see README). Guests scan a QR, take a selfie, and later get a private page with
   * only the photos they appear in. `showLink` adds a "Find your photos" link in the closing section.
   */
  photos: {
    showLink: true,
  },

  music: {
    /** MP3/WAV in /public/music. If the file is missing the music button hides itself. */
    src: "/music/wedding_invitation_reference_audio.mp3",
    title: "Wedding Invitation",
    artist: "Invitation theme",
    /** Show the floating play/pause button. false = the music starts by itself on the story's second page and plays throughout, with no control. */
    showControl: true,
  },

  theme: {
    // Changing these re-colours the whole site.
    ivory: "#fbf5ec", // cream paper
    paper: "#f3e6d6",
    ink: "#4d3329", // body text (warm brown)
    accent: "#7b2036", // names & headings (burgundy)
    button: "#7b2036", // primary button
    gold: "#b8893f",
    goldLight: "#e8d2a2",
    blush: "#f2cfcf", // blush pink wash
    leaf: "#9bae8c", // sage green
    sand: "#d8b27c",
    sandDark: "#a97c42",
    water: "#9ccfe0",
    fontScript: "'Playball', cursive",
    fontDisplay: "'Cormorant Garamond', Georgia, serif",
    fontBody: "'EB Garamond', Georgia, serif",
  },

  share: {
    /** Public URL of the invitation. Overridden by the VITE_SITE_URL env variable when set. */
    siteUrl: "",
    title: "Lalit & Aakansha — Wedding Invitation",
    description: "Together with our families, we invite you to celebrate our wedding on 12 December 2026 in Trombay, Mumbai.",
    whatsappText: "You're invited to the wedding of Lalit & Aakansha on 12 December 2026 💛",
  },
};

export type WeddingConfig = typeof wedding;

export const coupleNames = (w: { couple: { order: string; groom: string; bride: string } } = wedding) =>
  w.couple.order === "groom-first" ? [w.couple.groom, w.couple.bride] : [w.couple.bride, w.couple.groom];
