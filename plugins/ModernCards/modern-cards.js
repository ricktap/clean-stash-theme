/* Modern Cards for Stash: UI plugin part.
   Renders data that plain CSS cannot reach: performers, tags, file type and
   codecs on scene cards; name overlay and stats on performer cards; spec line
   and "Show more" on the scene page. Uses PluginApi.patch, no extra requests. */
(function () {
  "use strict";

  const api = window.PluginApi;
  if (!api || !api.patch) return;
  const React = api.React;
  const h = React.createElement;
  const Link = api.libraries.ReactRouterDOM.Link;

  /* ---------- helpers ---------- */
  const stop = (e) => e.stopPropagation();

  function fileSize(bytes) {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let v = bytes, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (i >= 3 ? v.toFixed(1) : Math.round(v)) + " " + units[i];
  }

  function resolution(w, hgt) {
    const s = Math.min(w, hgt);
    if (s >= 4000) return "8K";
    if (s >= 2800) return "6K";
    if (s >= 2400) return "5K";
    if (s >= 2000) return "4K";
    if (s >= 1400) return "1440p";
    if (s >= 1000) return "1080p";
    if (s >= 700) return "720p";
    if (s >= 530) return "540p";
    if (s >= 460) return "480p";
    if (s >= 350) return "360p";
    if (s >= 230) return "240p";
    return s + "p";
  }

  function timestamp(sec) {
    sec = Math.round(sec);
    const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
    const p = (n) => String(n).padStart(2, "0");
    return hh ? hh + ":" + p(mm) + ":" + p(ss) : mm + ":" + p(ss);
  }

  function fileType(path) {
    if (!path) return "";
    const ext = path.split(/[\\/]/).pop().split(".").pop();
    return ext && ext.length <= 5 ? ext.toUpperCase() : "";
  }

  const VCODEC = { h264: "H.264", hevc: "HEVC", h265: "HEVC", av1: "AV1", vp9: "VP9", vp8: "VP8", mpeg4: "MPEG-4", mpeg2video: "MPEG-2", wmv3: "WMV3", wmv2: "WMV2", vc1: "VC-1" };
  const ACODEC = { aac: "AAC", opus: "Opus", mp3: "MP3", ac3: "AC3", eac3: "E-AC3", flac: "FLAC", vorbis: "Vorbis", wmav2: "WMA", dts: "DTS", truehd: "TrueHD" };
  const codecName = (map, c) => (c ? map[c.toLowerCase()] || c.toUpperCase() : "");

  function codecs(f) {
    if (!f) return "";
    return [codecName(VCODEC, f.video_codec), codecName(ACODEC, f.audio_codec)].filter(Boolean).join("/");
  }

  function dotted(parts, sepClass) {
    const out = [];
    parts.forEach((p, i) => {
      if (i) out.push(h("span", { key: "d" + i, className: sepClass || "mc-dot" }, "·"));
      out.push(h(React.Fragment, { key: "p" + i }, p));
    });
    return out;
  }

  function initials(name) {
    return (name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }

  function age(birthdate, at) {
    if (!birthdate) return 0;
    const b = new Date(birthdate), d = at ? new Date(at) : new Date();
    if (isNaN(b) || isNaN(d)) return 0;
    let a = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && d.getDate() < b.getDate())) a--;
    return a > 0 ? a : 0;
  }

  // gender marks as bold SVG strokes (text glyphs are too thin at small sizes)
  const GENDER_PATHS = {
    FEMALE: ["M8 2.5a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z", "M8 10v5", "M5.75 12.75h4.5"],
    MALE: ["M6.5 6a4 4 0 100 8 4 4 0 000-8z", "M9.4 8.6L14 4", "M10.5 3.5H14V7"],
    TRANSGENDER_FEMALE: ["M8 4.5a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z", "M8 11v4", "M6 13h4", "M10.3 2.2L12.8 2.2 12.8 4.7", "M10.4 6.6l2.4-2.4"],
    TRANSGENDER_MALE: ["M8 4.5a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5z", "M8 11v4", "M6 13h4", "M10.3 2.2L12.8 2.2 12.8 4.7", "M10.4 6.6l2.4-2.4"],
    INTERSEX: ["M8 5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z", "M8 12v3", "M6.25 13.5h3.5", "M10.5 5.5L13.5 2.5", "M11 2.5h2.5V5"],
    NON_BINARY: ["M8 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z", "M8 1.5v5", "M6 2.5l4 3", "M10 2.5l-4 3"],
  };
  const GENDER_LABEL = { FEMALE: "Female", MALE: "Male", TRANSGENDER_FEMALE: "Trans female", TRANSGENDER_MALE: "Trans male", INTERSEX: "Intersex", NON_BINARY: "Non-binary" };
  const GENDER = {};
  Object.keys(GENDER_PATHS).forEach((k) => {
    GENDER[k] = h("svg", { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className: "mc-gender-ico", role: "img", "aria-label": GENDER_LABEL[k] },
      h("title", null, GENDER_LABEL[k]), GENDER_PATHS[k].map((d, i) => h("path", { key: i, d: d })));
  });

  const PATHS = {
    eye: "M8 3C4.5 3 1.9 5.3 1 8c.9 2.7 3.5 5 7 5s6.1-2.3 7-5c-.9-2.7-3.5-5-7-5zm0 8a3 3 0 110-6 3 3 0 010 6z",
    drop: "M8 1.5S3.5 7 3.5 10a4.5 4.5 0 009 0C12.5 7 8 1.5 8 1.5z",
    film: "M2 3h12v10H2zm2 1v2h2V4zm6 0v2h2V4zM4 10v2h2v-2zm6 0v2h2v-2z",
    pin: "M8 1a4.5 4.5 0 00-4.5 4.5C3.5 9 8 15 8 15s4.5-6 4.5-9.5A4.5 4.5 0 008 1zm0 6.2a1.7 1.7 0 110-3.4 1.7 1.7 0 010 3.4z",
  };
  const icon = (name) => h("svg", { className: "mc-ico", viewBox: "0 0 16 16", "aria-hidden": "true" }, h("path", { d: PATHS[name] }));
  const check = h("svg", { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, h("path", { d: "M3.5 8.5l3 3 6-7" }));

  function rating(r100) {
    return h("span", { className: "mc-rating" + (r100 ? "" : " is-empty"), title: "Rating" },
      r100 ? "★ " + (r100 / 20).toFixed(1) : "☆");
  }

  /* ---------- scene card ---------- */

  // MP4·1080p top left, duration bottom right
  api.patch.instead("SceneCard.SceneSpecs", function (props) {
    const f = props.scene && props.scene.files && props.scene.files[0];
    if (!f) return null;
    const parts = [fileType(f.path), f.width && f.height ? resolution(f.width, f.height) : ""].filter(Boolean);
    return h("div", { className: "scene-specs-overlay mc-specs" },
      parts.length ? h("span", { className: "mc-pill mc-res" }, dotted(parts)) : null,
      f.duration > 0 ? h("span", { className: "mc-pill mc-dur" }, timestamp(f.duration)) : null);
  });

  // studio name bottom left, organized badge top right
  api.patch.instead("SceneCard.Overlays", function (props) {
    const s = props.scene;
    return h(React.Fragment, null,
      s.organized ? h("span", { className: "mc-org", title: "Organized" }, check) : null);
  });

  // performer chip with a photo preview after 0.7s of hover
  const PREVIEW_DELAY = 700;
  function PerformerChip(props) {
    const p = props.performer;
    const ref = React.useRef(null);
    const timer = React.useRef(0);
    const [pos, setPos] = React.useState(null);

    const hide = React.useCallback(() => { clearTimeout(timer.current); setPos(null); }, []);
    function show() {
      clearTimeout(timer.current);
      if (!p.image_path) return;
      timer.current = setTimeout(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const W = 160, H = 240 + 38, M = 8;
        const above = r.top - H - M > 8;
        const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
        setPos({ left: left, top: above ? r.top - H - M : r.bottom + M });
      }, PREVIEW_DELAY);
    }
    React.useEffect(() => {
      if (!pos) return undefined;
      window.addEventListener("scroll", hide, true);
      return () => window.removeEventListener("scroll", hide, true);
    }, [pos, hide]);
    React.useEffect(() => () => clearTimeout(timer.current), []);

    const preview = pos && api.ReactDOM && api.ReactDOM.createPortal
      ? api.ReactDOM.createPortal(
        h("div", { className: "mc-perf-preview", style: { left: pos.left + "px", top: pos.top + "px" }, role: "tooltip" },
          h("img", { src: p.image_path, alt: "" }),
          h("div", { className: "mc-perf-preview-name" }, GENDER[p.gender] ? h("span", { className: "mc-gender mc-g-" + String(p.gender).toLowerCase() }, GENDER[p.gender]) : null, p.name,
            p.disambiguation ? h("small", null, p.disambiguation) : null)),
        document.body)
      : null;

    return h(Link, {
      to: "/performers/" + p.id, className: "mc-chip", ref: ref,
      onClick: (e) => { hide(); stop(e); },
      onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide,
      "aria-label": p.name,
    },
      p.image_path ? h("img", { src: p.image_path, alt: "", loading: "lazy" }) : h("span", { className: "mc-initials" }, initials(p.name)),
      h("span", { className: "mc-chip-name" }, p.name),
      preview);
  }

  // date line, performers, tags, description
  function SceneDetails(props) {
    const s = props.scene;
    const [open, setOpen] = React.useState(false);
    const perfs = s.performers || [];
    const tags = s.tags || [];
    const MAX_P = 3, MAX_T = 4;
    const shownTags = open ? tags : tags.slice(0, MAX_T);

    // Fixed order and fixed-height rows under the title, so studio, performers,
    // description and tags line up across neighbouring cards. Empty rows still
    // render (as placeholders) to keep that rhythm.
    return h("div", { className: "scene-card__details mc-details" },
      h("div", { className: "mc-meta" },
        s.studio ? h(Link, { to: "/studios/" + s.studio.id, className: "mc-meta-studio", onClick: stop, title: s.studio.name }, s.studio.name) : h("span", { className: "mc-meta-empty" }, "No studio"),
        s.date ? h("span", { className: "mc-meta-date" }, s.date) : null),
      h("div", { className: "mc-cast" },
        perfs.length
          ? perfs.slice(0, MAX_P).map((p) => h(PerformerChip, { key: p.id, performer: p }))
          : h("span", { className: "mc-cast-empty" }, "No performers"),
        perfs.length > MAX_P ? h(Link, { to: "/scenes/" + s.id, className: "mc-chip mc-more", onClick: stop, title: perfs.slice(MAX_P).map((p) => p.name).join(", ") }, "+" + (perfs.length - MAX_P)) : null),
      h("p", { className: "mc-desc" + (s.details ? "" : " is-empty") }, s.details || ""),
      h("div", { className: "mc-tags" + (open ? " is-open" : "") },
        shownTags.map((t) => h(Link, { key: t.id, to: "/tags/" + t.id, className: "mc-tag", onClick: stop }, t.name)),
        tags.length > MAX_T ? h("button", {
          type: "button", className: "mc-tag mc-tag-more", "aria-expanded": open,
          onClick: (e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); },
        }, open ? "Less" : "+" + (tags.length - MAX_T)) : null));
  }


  api.patch.instead("SceneCard.Details", function (props) { return h(SceneDetails, props); });

  // quiet footer instead of the popover buttons
  api.patch.instead("SceneCard.Popovers", function (props) {
    if (props.compact) return null;
    const s = props.scene;
    const f = s.files && s.files[0];
    const spec = [codecs(f), f ? fileSize(f.size) : ""].filter(Boolean);
    let groupIndex;
    if (props.fromGroupId && s.groups) {
      const g = s.groups.find((x) => x.group.id === props.fromGroupId);
      groupIndex = g && g.scene_index;
    }
    return h("div", { className: "mc-foot" },
      groupIndex != null ? h("span", { title: "Scene number" }, "#" + groupIndex) : null,
      h("span", { title: "Plays" }, icon("eye"), s.play_count || 0),
      h("span", { title: "O-count" }, icon("drop"), s.o_counter || 0),
      s.scene_markers && s.scene_markers.length ? h("span", { title: "Markers" }, icon("pin"), s.scene_markers.length) : null,
      spec.length ? h("span", { className: "mc-spec", title: "Video/audio codec · file size" }, dotted(spec)) : null,
      rating(s.rating100));
  });

  /* ---------- performer card ---------- */

  api.patch.after("PerformerCard.Overlays", function () {
    const props = arguments[0];
    const result = arguments[arguments.length - 1];
    const p = props.performer;
    const a = age(p.birthdate, props.ageFromDate || p.death_date);
    const g = GENDER[p.gender];
    return h(React.Fragment, null, result,
      h("div", { className: "mc-perf-name" },
        h("b", null, g ? h("span", { className: "mc-gender mc-g-" + String(p.gender).toLowerCase() }, g) : null, p.name),
        a || p.country ? h("small", null,
          a ? (props.ageFromDate ? a + " at production" : a + " yrs") : null,
          p.country ? h("span", { className: "mc-cc" }, p.country) : null) : null));
  });

  api.patch.instead("PerformerCard.Popovers", function (props) {
    const p = props.performer;
    return h("div", { className: "mc-foot" },
      h("span", { title: "Scenes" }, icon("film"), p.scene_count || 0),
      h("span", { title: "O-count" }, icon("drop"), p.o_counter || 0),
      rating(p.rating100));
  });

  /* ---------- start page rows: native, page-wise scrolling ---------- */
  // Replaces Stash's infinite react-slick carousel (which clones and swaps
  // cards mid-move) with a plain scroll row. Arrows move exactly one page of
  // whole cards; trackpad / shift-wheel scrolling snaps to card edges.
  // Works on newer Stash (FilteredRecommendationRow) and older Stash
  // (each *RecommendationRow renders <Slider> itself).

  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const arrowPath = { prev: "M10 3L5 8l5 5", next: "M6 3l5 5-5 5" };
  const arrow = (dir) => h("svg", { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, h("path", { d: arrowPath[dir] }));

  // Stash renders its loading skeletons with one shared key ("_undefined"), so
  // React cannot tell them apart and leaves some behind once the real cards
  // arrive. Give each skeleton its own key; real cards keep theirs.
  const isSkeleton = (c) => c && c.props && typeof c.props.className === "string" && c.props.className.indexOf("skeleton-card") !== -1;
  function cleanKeys(children) {
    const out = [];
    React.Children.forEach(children, (c) => {
      if (c == null || c === false) return;
      if (isSkeleton(c)) out.push(React.cloneElement(c, { key: "mc-skel-" + out.length }));
      else out.push(c);
    });
    return out;
  }

  function PagedTrack(props) {
    const ref = React.useRef(null);
    const [nav, setNav] = React.useState({ prev: false, next: false });
    const items = cleanKeys(props.children);
    const loading = items.length > 0 && items.every(isSkeleton);
    const count = items.length;

    const sync = React.useCallback(() => {
      const el = ref.current;
      if (!el) return;
      setNav({ prev: el.scrollLeft > 4, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    }, []);

    React.useEffect(() => {
      const el = ref.current;
      if (!el) return undefined;
      sync();
      el.addEventListener("scroll", sync, { passive: true });
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
      if (ro) ro.observe(el);
      return () => { el.removeEventListener("scroll", sync); if (ro) ro.disconnect(); };
    }, [sync, count]);

    function page(dir) {
      const el = ref.current;
      if (!el) return;
      const first = el.firstElementChild;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth;
      const perPage = Math.max(1, Math.floor((el.clientWidth + gap) / step));
      el.scrollBy({ left: dir * perPage * step, behavior: reduceMotion() ? "auto" : "smooth" });
    }

    return h(React.Fragment, null,
      h("div", { className: "mc-row-nav" },
        h("button", { type: "button", className: "mc-row-btn", "aria-label": "Previous page", disabled: !nav.prev, onClick: () => page(-1) }, arrow("prev")),
        h("button", { type: "button", className: "mc-row-btn", "aria-label": "Next page", disabled: !nav.next, onClick: () => page(1) }, arrow("next"))),
      h("div", { className: "mc-row-track" + (loading ? " is-loading" : ""), ref: ref, "aria-busy": loading || undefined }, items));
  }

  // Older Stash: swap the <Slider> element inside a rendered row for PagedTrack.
  const isSlider = (el) => el && el.props && ("slidesToShow" in el.props || "responsive" in el.props || "slidesToScroll" in el.props);
  function unslick(el, depth) {
    if (!el || typeof el !== "object" || !el.props || depth > 6) return el;
    if (isSlider(el)) return h(PagedTrack, { key: el.key }, el.props.children);
    const kids = el.props.children;
    if (kids == null) return el;
    let changed = false;
    const mapped = React.Children.map(kids, (c) => { const n = unslick(c, depth + 1); if (n !== c) changed = true; return n; });
    if (!changed) return el;
    return React.cloneElement(el, null, ...(Array.isArray(mapped) ? mapped : [mapped]));
  }
  ["SceneRecommendationRow", "StudioRecommendationRow", "PerformerRecommendationRow", "GalleryRecommendationRow",
    "GroupRecommendationRow", "MovieRecommendationRow", "ImageRecommendationRow", "SceneMarkerRecommendationRow",
    "TagRecommendationRow"].forEach((name) => {
    api.patch.after(name, function () {
      const result = arguments[arguments.length - 1];
      return unslick(result, 0);
    });
  });

  // Newer Stash: one shared row component, also gives us the total count.
  api.patch.instead("FilteredRecommendationRow", function (props) {
    if (!props.loading && !props.count) return null;
    const Intl = api.libraries.Intl;
    const header = h(React.Fragment, null, props.heading,
      props.count ? h("span", { className: "mc-row-count" }, props.count.toLocaleString()) : null);
    const link = h(Link, { to: props.url },
      Intl ? h(Intl.FormattedMessage, { id: "view_all", defaultMessage: "View all" }) : "View all");
    const track = h(PagedTrack, { key: props.loading ? "loading" : "loaded" }, props.children);
    const Row = api.components && api.components.RecommendationRow;
    if (Row) return h(Row, { className: props.className, header: header, link: link }, track);
    return h("div", { className: "recommendation-row " + (props.className || "") },
      h("div", { className: "recommendation-row-head" }, h("div", null, h("h2", null, header)), link),
      track);
  });

  /* ---------- scene page sidebar ---------- */

  function enhanceDescriptions(root) {
    root.querySelectorAll(".tab-pane .col-12 > p.pre:not([data-mc])").forEach((p) => {
      p.setAttribute("data-mc", "1");
      p.classList.add("mc-clamp");
      requestAnimationFrame(() => {
        if (p.scrollHeight <= p.clientHeight + 2) { p.classList.remove("mc-clamp"); return; }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mc-desc-toggle";
        btn.textContent = "Show more";
        btn.addEventListener("click", () => {
          const isOpen = p.classList.toggle("mc-open");
          btn.textContent = isOpen ? "Show less" : "Show more";
        });
        p.parentElement.appendChild(btn);
      });
    });
  }

  // scrubber (thumbnail strip under the player): hidden by default, toggle remembered
  const SCRUB_KEY = "mc-scrubber-visible";
  function scrubberVisible() {
    try { return localStorage.getItem(SCRUB_KEY) === "1"; } catch (e) { return false; }
  }
  function applyScrubber(btn) {
    const visible = scrubberVisible();
    document.body.classList.toggle("mc-scrubber-hidden", !visible);
    if (btn) {
      // only touch the DOM when something changed (a MutationObserver calls this)
      const label = visible ? "Hide scrubber" : "Show scrubber";
      if (btn.textContent !== label) btn.textContent = label;
      if (btn.getAttribute("aria-pressed") !== String(visible)) btn.setAttribute("aria-pressed", String(visible));
    }
  }
  function ensureScrubberToggle() {
    const container = document.querySelector(".scene-player-container");
    if (!container || !container.querySelector(".scrubber-wrapper")) return;
    let btn = container.querySelector(".mc-scrubber-toggle");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mc-scrubber-toggle";
      btn.addEventListener("click", () => {
        try { localStorage.setItem(SCRUB_KEY, scrubberVisible() ? "0" : "1"); } catch (e) { /* private mode */ }
        applyScrubber(btn);
      });
      container.appendChild(btn);
    }
    applyScrubber(btn);
  }

  function ScenePageEnhancer(props) {
    const scene = props.scene;
    // "Show more" for long descriptions, also when the Details tab is opened later
    React.useEffect(() => {
      const root = document.querySelector(".scene-tabs");
      if (!root) return undefined;
      enhanceDescriptions(root);
      const obs = new MutationObserver(() => enhanceDescriptions(root));
      obs.observe(root, { childList: true, subtree: true });
      return () => obs.disconnect();
    }, [scene && scene.id]);
    // scrubber toggle; the player mounts a bit later, so watch for it
    React.useEffect(() => {
      applyScrubber(null);
      ensureScrubberToggle();
      const root = document.querySelector(".scene-player-container") || document.body;
      const obs = new MutationObserver(ensureScrubberToggle);
      obs.observe(root, { childList: true, subtree: true });
      return () => { obs.disconnect(); document.body.classList.remove("mc-scrubber-hidden"); };
    }, [scene && scene.id]);
    return null;
  }

  api.patch.after("ScenePage", function () {
    const props = arguments[0];
    const result = arguments[arguments.length - 1];
    return h(React.Fragment, null, result, h(ScenePageEnhancer, { scene: props.scene }));
  });
})();
