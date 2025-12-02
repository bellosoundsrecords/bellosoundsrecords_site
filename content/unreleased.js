// content/unreleased.js
// Identico come struttura a releases.js ma per tracce NON ancora pubblicate

export const unreleased = [
  {
    slug: "bsru001-working-title",
    catalog: "BSR-U001",          // "U" per Unreleased (non verrà vista nella home)
    title: "Working Title",       // Nome provvisorio o definitivo
    artists: ["Nick Evan"],       // O Neel Miles / Mark Ellis / BDF / ecc.
    alias: "nick-evan",           // Per routing e pagine autore
    previewAudio: "/audio/previews/BSRU001_mono64.mp3",   // opzionale
    releaseDate: "TBA",           // puoi lasciare TBA
    cover: "/images/unreleased/BSRU001.jpg", // immagine, anche provvisoria

    tags: [
      "unreleased",
      "deephouse",
      "soulfulhouse",
      "NickEvan",
      "BelloSoundsRecords"
    ],

    descriptionShort:
      "A preview of what’s coming next — still private, still evolving.",

    descriptionLong:
      "This track is part of the internal BelloSounds pipeline. Not published yet, "
      + "but fully playable inside the Secret Room. The idea is simple: share the "
      + "creative process in advance — bass studies, sketches, late-night grooves, "
      + "unfinished stories still shaping up.",

    tracks: [
      { title: "Working Title (Draft Mix)", bpm: 123, key: "A minor", isrc: "TBD" }
    ],

    // In unreleased non serve YouTube embed (ma se ce l’hai come non-in-elenco funziona!)
    embeds: {
      youtube: null,           // oppure un ID non in elenco
      spotify: null
    },

    links: {},                 // vuoto

    credits: {
      writtenBy: "Nick Evan",
      producedBy: "Nick Evan",
      mixedBy: "Nick Evan",
      masteredBy: "Nick Evan",
      artwork: "BelloSounds Records"
    }
  }
];
