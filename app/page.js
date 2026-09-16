"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { Flip, Observer, ScrollToPlugin, ScrollTrigger } from "gsap/all";
import { Play, SkipBack, SkipForward } from "@phosphor-icons/react";
import html2canvas from "html2canvas";

gsap.registerPlugin(ScrollTrigger, Observer, Flip, ScrollToPlugin);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canRunParticleTransition = () => {
  if (typeof window === "undefined" || prefersReducedMotion()) return false;
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  return window.innerWidth >= 900 && !window.matchMedia("(pointer: coarse)").matches && !lowPower;
};

const sampleTransitionCanvas = (canvas, step = 9, limit = 6500) => {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const samples = [];
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const index = (y * canvas.width + x) * 4;
      const alpha = pixels[index + 3];
      if (alpha <= 10) continue;
      samples.push({
        x,
        y,
        r: pixels[index],
        g: pixels[index + 1],
        b: pixels[index + 2],
        a: alpha / 255
      });
    }
  }
  if (samples.length <= limit) return samples;
  const reduced = [];
  const stride = samples.length / limit;
  for (let index = 0; index < limit; index += 1) reduced.push(samples[Math.floor(index * stride)]);
  return reduced;
};

const seededUnit = (index, salt = 0) => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const shuffleTransitionSamples = (samples) => {
  const shuffled = samples.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(seededUnit(index, 4) * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};

const captureTransitionSection = (element) => {
  const scale = Math.min(.56, 1120 / Math.max(window.innerWidth, 1));
  return html2canvas(element, {
    backgroundColor: null,
    scale,
    useCORS: true,
    logging: false,
    width: element.clientWidth,
    height: Math.min(element.clientHeight, window.innerHeight),
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    scrollX: 0,
    scrollY: -window.scrollY
  });
};

const projects = [
  { id: "01", title: "Yield Enhancer", sector: "Fintech · Product strategy", tone: "blue" },
  { id: "02", title: "Rituals", sector: "Wellness · Mobile product", tone: "red" },
  { id: "03", title: "After Hours", sector: "Culture · Digital experience", tone: "silver" },
  { id: "04", title: "Northstar", sector: "AI · Interaction design", tone: "violet" }
];
const galleryItems = ["Kinetic type", "A new kind of bank", "Midnight radio", "Human systems", "Motion studies"];
const gallerySparkles = Array.from({ length: 48 }, (_, index) => ({
  "--spark-x": `${7 + (index * 37) % 87}%`,
  "--spark-drift": `${-42 + (index * 29) % 85}px`,
  "--spark-delay": `${-((index * .173) % 2.7).toFixed(2)}s`,
  "--spark-duration": `${(1.35 + ((index * 11) % 16) / 10).toFixed(2)}s`,
  "--spark-size": `${index % 11 === 0 ? 4 : index % 5 === 0 ? 3 : index % 3 === 0 ? 2 : 1}px`,
  "--spark-rise": `${12 + (index * 17) % 15}vh`
}));
const collage = [
  ["01", "cinema", "back"], ["02", "coast", "mid"], ["03", "portrait", "front"],
  ["04", "night", "back"], ["05", "playlist", "front"], ["06", "phone", "mid"],
  ["07", "city", "mid"], ["08", "studio", "back"]
];
const records = [
  { id: "instant-crush", title: "Instant Crush", art: "instant", cover: "/media/contact/instant-crush.jpg", audio: "/media/audio/instant-crush.mp3" },
  { id: "avunu-nijam", title: "Avunu Nijam", art: "avunu", cover: "/media/contact/avunu-nijam.jpg", audio: "/media/audio/avunu-nijam.mp3" },
  { id: "the-way-i-am", title: "The Way I Am", art: "way", cover: "/media/contact/the-way-i-am.jpg", audio: "/media/audio/the-way-i-am.mp3" },
  { id: "in-the-end", title: "In the End", art: "end", cover: "/media/contact/in-the-end.jpg", audio: "/media/audio/in-the-end.mp3" }
];
const railSections = [
  { id: "top", label: "Hero", pos: .08 },
  { id: "intro", label: "Intro", pos: .248 },
  { id: "gallery", label: "Gallery", pos: .416 },
  { id: "work", label: "Work", pos: .584 },
  { id: "about", label: "About", pos: .752 },
  { id: "contact", label: "Contact", pos: .92 }
];

function Arrow({ direction = "right" }) {
  return <span className={"arrow arrow-" + direction} aria-hidden="true" />;
}

function NavRail() {
  const railRef = useRef(null);
  const handleRef = useRef(null);
  const labelRef = useRef(null);
  const positionsRef = useRef(railSections);
  const scrollStopsRef = useRef([]);
  const dragging = useRef(false);
  const jumping = useRef(false);
  const dragPosition = useRef(0);

  useEffect(() => {
    const rail = railRef.current;
    const handle = handleRef.current;
    const label = labelRef.current;
    let contactTrigger;
    let progressTrigger;
    let horizontal = false;
    let currentProgress = 0;
    let touchPrimed = false;
    let jumpTween;

    const targetY = (id) => {
      const gallery = ScrollTrigger.getById("gallery-scrub");
      if (id === "gallery" && gallery) return gallery.start + 3;
      if (id === "work" && gallery) return gallery.start + (gallery.end - gallery.start) * .74;
      const trigger = ScrollTrigger.getById(`${id}-section`);
      if (trigger) return trigger.start;
      const element = document.getElementById(id);
      return element ? window.scrollY + element.getBoundingClientRect().top : 0;
    };

    const nearestSection = (position) => positionsRef.current.reduce((nearest, section) =>
      Math.abs(section.pos - position) < Math.abs(nearest.pos - position) ? section : nearest
    );

    const pageYToRailPosition = (pageY) => {
      const stops = scrollStopsRef.current;
      if (!stops.length || pageY <= stops[0].y) return railSections[0].pos;
      for (let index = 0; index < stops.length - 1; index++) {
        const current = stops[index];
        const next = stops[index + 1];
        if (pageY <= next.y) {
          const progress = gsap.utils.clamp(0, 1, (pageY - current.y) / Math.max(1, next.y - current.y));
          return gsap.utils.interpolate(current.pos, next.pos, progress);
        }
      }
      return stops[stops.length - 1].pos;
    };

    const updateStops = () => {
      rail.querySelectorAll(".nav-stop").forEach((stop) => {
        const section = positionsRef.current.find((item) => item.id === stop.dataset.section);
        if (section) stop.style.setProperty("--stop", `${section.pos * 100}%`);
      });
    };

    const updateActiveStop = (position) => {
      const active = nearestSection(position).id;
      rail.querySelectorAll(".nav-stop").forEach((stop) => stop.classList.toggle("active", stop.dataset.section === active));
    };

    const setHandlePosition = (position, animate = false) => {
      const properties = horizontal
        ? { left: `${position * 100}%`, top: "50%" }
        : { left: "50%", top: `${position * 100}%` };
      if (animate) gsap.to(handle, { ...properties, duration: .65, ease: "power3.inOut", overwrite: true });
      else gsap.set(handle, properties);
    };

    const updateRailMode = (scrollY) => {
      const gallery = ScrollTrigger.getById("gallery-scrub");
      const workStart = gallery ? gallery.start + (gallery.end - gallery.start) * .74 : 0;
      const nextHorizontal = Boolean(gallery && scrollY >= gallery.start && scrollY < workStart - 4);
      if (nextHorizontal === horizontal) return;
      horizontal = nextHorizontal;
      rail.classList.toggle("is-gallery", horizontal);
      setHandlePosition(currentProgress);
    };

    const rebuildPositions = () => {
      positionsRef.current = railSections;
      scrollStopsRef.current = railSections.map((section) => ({ ...section, y: targetY(section.id) }));
      updateStops();
      currentProgress = pageYToRailPosition(window.scrollY);
      updateRailMode(window.scrollY);
      updateActiveStop(currentProgress);
      if (!dragging.current && !jumping.current) {
        setHandlePosition(currentProgress);
      }
    };

    const jumpTo = (section) => {
      jumpTween?.kill();
      jumping.current = true;
      window.dispatchEvent(new CustomEvent("nav-rail-jump-start", {
        detail: { section: section.id, fromY: window.scrollY }
      }));
      const duration = prefersReducedMotion() ? 0 : 1.05;
      const y = targetY(section.id);
      setHandlePosition(section.pos, true);
      jumpTween = gsap.to(window, {
        scrollTo: y,
        duration,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          jumpTween = null;
          jumping.current = false;
          currentProgress = section.pos;
          updateRailMode(y);
          setHandlePosition(currentProgress);
          updateActiveStop(currentProgress);
          rebuildPositions();
          if (section.id === "work") window.dispatchEvent(new Event("nav-open-work"));
          if (section.id === "gallery") window.dispatchEvent(new Event("nav-open-gallery"));
          if (section.id === "about") window.dispatchEvent(new Event("show-life-outside"));
          window.dispatchEvent(new CustomEvent("nav-rail-arrive", { detail: { section: section.id } }));
          window.dispatchEvent(new Event("nav-rail-jump-ready"));
          if (!rail.matches(":hover")) rail.classList.remove("is-engaged");
        }
      });
    };

    const positionFromPointer = (event) => {
      const bounds = rail.getBoundingClientRect();
      return horizontal
        ? gsap.utils.clamp(.08, .92, (event.clientX - bounds.left) / bounds.width)
        : gsap.utils.clamp(.08, .92, (event.clientY - bounds.top) / bounds.height);
    };

    const updateDrag = (event) => {
      if (!dragging.current) return;
      const position = positionFromPointer(event);
      dragPosition.current = position;
      setHandlePosition(position);
      label.textContent = nearestSection(position).label;
      updateActiveStop(position);
    };

    const finishDrag = (event) => {
      if (!dragging.current) return;
      dragging.current = false;
      rail.classList.remove("is-dragging");
      handle.releasePointerCapture?.(event.pointerId);
      handle.blur();
      gsap.to(label, { opacity: 0, x: -4, duration: .2, ease: "power2.out" });
      jumpTo(nearestSection(dragPosition.current));
    };

    const startDrag = (event) => {
      event.preventDefault();
      event.stopPropagation();
      dragging.current = true;
      rail.classList.add("is-engaged");
      rail.classList.add("is-dragging");
      dragPosition.current = positionFromPointer(event);
      handle.setPointerCapture?.(event.pointerId);
      label.textContent = nearestSection(dragPosition.current).label;
      gsap.to(label, { opacity: 1, x: 0, duration: .2, ease: "power2.out" });
      updateDrag(event);
    };

    const clickTrack = (event) => {
      if (event.target !== rail && !event.target.classList.contains("nav-rail-hit")) return;
      if (touchPrimed) {
        touchPrimed = false;
        return;
      }
      const position = positionFromPointer(event);
      jumpTo(nearestSection(position));
    };
    const clickStop = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
      const section = positionsRef.current.find((item) => item.id === event.currentTarget.dataset.section);
      if (section) jumpTo(section);
    };

    const engage = () => rail.classList.add("is-engaged");
    const disengage = () => {
      if (!dragging.current && !jumping.current) rail.classList.remove("is-engaged");
    };
    const primeTouch = (event) => {
      const isTrack = event.target === rail || event.target.classList.contains("nav-rail-hit");
      if (event.pointerType === "mouse" || !isTrack || rail.classList.contains("is-engaged")) return;
      touchPrimed = true;
      rail.classList.add("is-engaged");
    };
    const closeFromOutside = (event) => {
      if (event.pointerType !== "mouse" && !rail.contains(event.target) && !dragging.current && !jumping.current) {
        rail.classList.remove("is-engaged");
      }
    };
    const suspendForSceneHandoff = () => rail.classList.add("is-scene-handoff");
    const resumeAfterSceneHandoff = (event) => {
      const destination = event.detail?.section;

      if (destination === "work") {
        // Gallery's trigger can update while the rail is hidden during the
        // reverse handoff. Work always owns the original vertical-left rail.
        horizontal = false;
        rail.classList.remove("is-gallery");
        const workStop = positionsRef.current.find((section) => section.id === "work");
        if (workStop) currentProgress = workStop.pos;
        setHandlePosition(currentProgress);
        updateActiveStop(currentProgress);
      } else {
        updateRailMode(window.scrollY);
      }

      rail.classList.remove("is-scene-handoff");
    };

    handle.addEventListener("pointerdown", startDrag);
    handle.addEventListener("pointermove", updateDrag);
    handle.addEventListener("pointerup", finishDrag);
    handle.addEventListener("pointercancel", finishDrag);
    rail.addEventListener("click", clickTrack);
    rail.addEventListener("pointerenter", engage);
    rail.addEventListener("pointerleave", disengage);
    rail.addEventListener("pointerdown", primeTouch);
    document.addEventListener("pointerdown", closeFromOutside);
    window.addEventListener("work-about-handoff-start", suspendForSceneHandoff);
    window.addEventListener("work-about-handoff-complete", resumeAfterSceneHandoff);
    const stopButtons = Array.from(rail.querySelectorAll(".nav-stop"));
    stopButtons.forEach((stop) => stop.addEventListener("click", clickStop));

    const setup = () => {
      contactTrigger = ScrollTrigger.getById("contact-section") || ScrollTrigger.create({
        id: "contact-section",
        trigger: "#contact",
        start: "top top"
      });
      progressTrigger = ScrollTrigger.create({
        id: "nav-rail-progress",
        start: 0,
        end: () => ScrollTrigger.maxScroll(window),
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          currentProgress = pageYToRailPosition(self.scroll());
          if (!dragging.current && !jumping.current) {
            updateRailMode(self.scroll());
            setHandlePosition(currentProgress);
            updateActiveStop(currentProgress);
          }
        }
      });
      rebuildPositions();
    };
    const setupFrame = requestAnimationFrame(setup);
    ScrollTrigger.addEventListener("refresh", rebuildPositions);

    return () => {
      cancelAnimationFrame(setupFrame);
      ScrollTrigger.removeEventListener("refresh", rebuildPositions);
      handle.removeEventListener("pointerdown", startDrag);
      handle.removeEventListener("pointermove", updateDrag);
      handle.removeEventListener("pointerup", finishDrag);
      handle.removeEventListener("pointercancel", finishDrag);
      rail.removeEventListener("click", clickTrack);
      rail.removeEventListener("pointerenter", engage);
      rail.removeEventListener("pointerleave", disengage);
      rail.removeEventListener("pointerdown", primeTouch);
      document.removeEventListener("pointerdown", closeFromOutside);
      window.removeEventListener("work-about-handoff-start", suspendForSceneHandoff);
      window.removeEventListener("work-about-handoff-complete", resumeAfterSceneHandoff);
      stopButtons.forEach((stop) => stop.removeEventListener("click", clickStop));
      jumpTween?.kill();
      progressTrigger?.kill();
      contactTrigger?.kill();
    };
  }, []);

  return (
    <div className="nav-rail" ref={railRef} aria-label="Section navigation">
      <div className="nav-rail-hit" aria-hidden="true" />
      <div className="nav-rail-stops">
        {railSections.map((section) => <button type="button" className="nav-stop" data-section={section.id} style={{ "--stop": `${section.pos * 100}%` }} aria-label={`Navigate to ${section.label}`} key={section.id}><i aria-hidden="true" /><b>{section.label}</b></button>)}
      </div>
      <button className="nav-handle" ref={handleRef} type="button" aria-label="Drag to navigate sections">
        <i aria-hidden="true" />
        <span className="nav-handle-label" ref={labelRef}>Hero</span>
      </button>
    </div>
  );
}

function Hero() {
  const ref = useRef(null);
  const [changeWord, setChangeWord] = useState("change");
  const [changeGlitching, setChangeGlitching] = useState(false);
  const changeSwap = useRef({ active: false, hovered: false, index: 0, timers: [] });
  const runChangeSequence = () => {
    changeSwap.current.hovered = true;
    if (changeSwap.current.active) return;
    changeSwap.current.timers.forEach(window.clearTimeout);
    changeSwap.current.timers = [];
    changeSwap.current.active = true;
    const words = ["interaction", "design", "change"];
    const schedule = (callback, delay) => {
      const timer = window.setTimeout(() => {
        changeSwap.current.timers = changeSwap.current.timers.filter((entry) => entry !== timer);
        callback();
      }, delay);
      changeSwap.current.timers.push(timer);
    };
    const cycle = () => {
      if (!changeSwap.current.hovered) return;
      const word = words[changeSwap.current.index];
      setChangeGlitching(true);
      schedule(() => setChangeWord(word), 140);
      schedule(() => setChangeGlitching(false), 470);
      changeSwap.current.index = (changeSwap.current.index + 1) % words.length;
      schedule(cycle, 620);
    };
    cycle();
  };
  const stopChangeSequence = () => {
    changeSwap.current.hovered = false;
    changeSwap.current.active = false;
    changeSwap.current.index = 0;
    changeSwap.current.timers.forEach(window.clearTimeout);
    changeSwap.current.timers = [];
    setChangeGlitching(false);
    const settleTimer = window.setTimeout(() => {
      setChangeWord("change");
    }, 70);
    changeSwap.current.timers.push(settleTimer);
  };
  useEffect(() => () => {
    changeSwap.current.timers.forEach(window.clearTimeout);
    changeSwap.current.timers = [];
  }, []);
  useEffect(() => {
    const el = ref.current;
    let transitioning = false;
    let arrivingFromIntro = false;
    let heroObserver;
    let navigationTween;
    let particleCanvas;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
      el.classList.add("pointer-live");
    };
    const leave = () => el.classList.remove("pointer-live");
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    const playParticleHandoff = async () => {
      if (!canRunParticleTransition()) return false;
      const intro = document.querySelector("#intro");
      if (!intro) return false;
      window.dispatchEvent(new Event("hero-intro-particles-start"));
      try {
        const [heroFrame, introFrame] = await Promise.all([
          captureTransitionSection(el),
          captureTransitionSection(intro)
        ]);
        if (!heroFrame.width || !introFrame.width) throw new Error("Unable to capture transition frames");

        const heroSamples = sampleTransitionCanvas(heroFrame);
        const introSamples = sampleTransitionCanvas(introFrame);
        const count = Math.min(heroSamples.length, introSamples.length, 6500);
        if (count < 500) throw new Error("Not enough transition samples");
        const pickSamples = (samples) => Array.from({ length: count }, (_, index) => samples[Math.floor(index * samples.length / count)]);
        const starts = pickSamples(heroSamples);
        const destinations = shuffleTransitionSamples(pickSamples(introSamples));
        const centerX = heroFrame.width / 2;
        const centerY = heroFrame.height / 2;
        const particles = starts.map((start, index) => {
          const radial = Math.atan2(start.y - centerY, start.x - centerX);
          const angle = radial + (seededUnit(index, 1) - .5) * 1.35;
          const distance = 36 + seededUnit(index, 2) * 145;
          return {
            ...start,
            tx: destinations[index].x,
            ty: destinations[index].y,
            tr: destinations[index].r,
            tg: destinations[index].g,
            tb: destinations[index].b,
            ta: destinations[index].a,
            ex: start.x + Math.cos(angle) * distance,
            ey: start.y + Math.sin(angle) * distance,
            phase: seededUnit(index, 3) * Math.PI * 2,
            release: seededUnit(index, 5) * .1
          };
        });

        particleCanvas = document.createElement("canvas");
        particleCanvas.className = "section-particle-transition";
        particleCanvas.width = heroFrame.width;
        particleCanvas.height = heroFrame.height;
        particleCanvas.setAttribute("aria-hidden", "true");
        const context = particleCanvas.getContext("2d");
        const state = { progress: 0 };
        const particleSize = Math.max(2.2, heroFrame.width / window.innerWidth * 5.5);
        const paint = () => {
          const progress = state.progress;
          const exploding = progress < .44;
          const convergence = exploding ? 0 : (progress - .44) / .56;
          const convergenceEase = convergence * convergence * convergence
            * (convergence * (convergence * 6 - 15) + 10);
          const dustRevealRaw = Math.min(1, progress / .22);
          const dustReveal = dustRevealRaw * dustRevealRaw * (3 - 2 * dustRevealRaw);
          context.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
          context.globalAlpha = dustReveal;
          for (let index = 0; index < particles.length; index += 1) {
            const particle = particles[index];
            const releaseProgress = exploding
              ? Math.max(0, Math.min(1, (progress - particle.release) / (.44 - particle.release)))
              : 1;
            const explosionEase = releaseProgress * releaseProgress * (3 - 2 * releaseProgress);
            const waveStrength = exploding ? releaseProgress : 1 - convergence;
            const wave = Math.sin(progress * 11 + particle.phase) * waveStrength * 4;
            const x = exploding
              ? particle.x + (particle.ex - particle.x) * explosionEase + wave
              : particle.ex + (particle.tx - particle.ex) * convergenceEase + wave;
            const y = exploding
              ? particle.y + (particle.ey - particle.y) * explosionEase - wave * .55
              : particle.ey + (particle.ty - particle.ey) * convergenceEase - wave * .55;
            const colorMix = exploding ? 0 : convergenceEase;
            const red = Math.round(particle.r + (particle.tr - particle.r) * colorMix);
            const green = Math.round(particle.g + (particle.tg - particle.g) * colorMix);
            const blue = Math.round(particle.b + (particle.tb - particle.b) * colorMix);
            const alpha = particle.a + (particle.ta - particle.a) * colorMix;
            context.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
            const size = particleSize * (1 - Math.sin(progress * Math.PI) * .34);
            context.fillRect(x - size / 2, y - size / 2, size, size);
          }
          context.globalAlpha = 1;
        };
        paint();
        document.body.appendChild(particleCanvas);
        gsap.set(particleCanvas, { opacity: 0 });
        gsap.set(intro, { opacity: 0 });

        await new Promise((resolve) => {
          navigationTween = gsap.timeline({
            onComplete: resolve
          })
            .to(particleCanvas, { opacity: 1, duration: .12, ease: "power1.out" }, 0)
            .to(el, { opacity: 0, duration: .72, ease: "power2.inOut" }, 0)
            .to(state, { progress: 1, duration: 3.15, ease: "none", onUpdate: paint }, 0)
            .call(() => window.scrollTo(0, intro.offsetTop), null, .7)
            .to(intro, { opacity: 1, duration: 1, ease: "power2.inOut" }, 2.72)
            .to(particleCanvas, { opacity: 0, duration: 1.05, ease: "power2.inOut" }, 2.78);
        });

        particleCanvas.remove();
        particleCanvas = null;
        gsap.set(el, { clearProps: "opacity" });
        gsap.set(intro, { clearProps: "opacity" });
        window.dispatchEvent(new Event("hero-intro-particles-ready"));
        return true;
      } catch (error) {
        particleCanvas?.remove();
        particleCanvas = null;
        gsap.set(el, { clearProps: "opacity" });
        gsap.set(intro, { clearProps: "opacity" });
        window.dispatchEvent(new Event("hero-intro-particles-cancel"));
        return false;
      }
    };
    const enterIntro = async () => {
      if (transitioning) return;
      transitioning = true;
      navigationTween?.kill();
      const usedParticles = await playParticleHandoff();
      if (usedParticles) {
        heroObserver.disable();
        transitioning = false;
        return;
      }
      const intro = document.querySelector("#intro");
      if (intro) gsap.set(intro, { opacity: 0 });
      navigationTween = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          gsap.set(el, { clearProps: "opacity" });
          if (intro) gsap.set(intro, { clearProps: "opacity" });
          heroObserver.disable();
          transitioning = false;
        }
      })
        .to(el, { opacity: 0, duration: .34 }, 0)
        .to(window, { scrollTo: "#intro", duration: .5 }, .22)
        .to(intro, { opacity: 1, duration: .34 }, .42);
    };
    const returnToHero = () => {
      if (transitioning || window.scrollY < 2) return;
      transitioning = true;
      navigationTween?.kill();
      navigationTween = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => { transitioning = false; }
      })
        .to(window, { scrollTo: "#top", duration: 1.05 }, 0)
        .to(".hero-copy", { yPercent: 0, opacity: 1, duration: .72 }, .18)
        .to(".grid-floor", { opacity: .25, scale: 1, duration: .72 }, .18);
    };
    const holdForIntro = () => {
      arrivingFromIntro = true;
      heroObserver?.disable();
    };
    const releaseFromIntro = () => {
      arrivingFromIntro = false;
      if (window.scrollY < window.innerHeight * .25) heroObserver?.enable();
    };
    const holdForRail = () => {
      navigationTween?.kill();
      transitioning = false;
      heroObserver?.disable();
    };
    const settleFromRail = (event) => {
      if (event.detail?.section !== "top") return;
      gsap.set(".hero-copy", { yPercent: 0, opacity: 1 });
      gsap.set(".grid-floor", { opacity: .25, scale: 1 });
      heroObserver?.enable();
    };
    window.addEventListener("intro-hero-handoff-start", holdForIntro);
    window.addEventListener("intro-hero-handoff-ready", releaseFromIntro);
    window.addEventListener("nav-rail-jump-start", holdForRail);
    window.addEventListener("nav-rail-arrive", settleFromRail);
    heroObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      preventDefault: true,
      tolerance: 18,
      onChangeY: (self) => {
        if (self.deltaY > 0) enterIntro();
        else returnToHero();
      }
    });
    const trigger = ScrollTrigger.create({
      id: "top-section",
      trigger: el,
      start: "top top",
      end: "bottom top+=10",
      onEnter: () => heroObserver.enable(),
      onEnterBack: () => {
        gsap.set(".hero-copy", { yPercent: -12, opacity: 0 });
        gsap.set(".grid-floor", { opacity: 0, scale: 1.08 });
        if (!arrivingFromIntro) heroObserver.enable();
        gsap.to(".hero-copy", { yPercent: 0, opacity: 1, duration: .72, ease: "power3.inOut" });
        gsap.to(".grid-floor", { opacity: .25, scale: 1, duration: .72, ease: "power3.inOut" });
      },
      onLeave: () => heroObserver.disable()
    });
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("intro-hero-handoff-start", holdForIntro);
      window.removeEventListener("intro-hero-handoff-ready", releaseFromIntro);
      window.removeEventListener("nav-rail-jump-start", holdForRail);
      window.removeEventListener("nav-rail-arrive", settleFromRail);
      navigationTween?.kill();
      particleCanvas?.remove();
      heroObserver.kill();
      trigger.kill();
    };
  }, []);
  return (
    <section className="hero dark" ref={ref} id="top">
      <nav className="nav"><a href="#top" className="nav-logo" aria-label="Sri Harsha — home"><img src="/media/hero/name-vectorized-nav.svg" alt="" /></a><a href="#contact">Let’s talk <Arrow /></a></nav>
      <div className="hero-light" />
      <div className="hero-copy">
        <div className="name-wrap">
          <h1 className="name-vector-heading"><span className="sr-only">Sri Harsha</span><img className="name-vector" src="/media/hero/name-vectorized.svg" alt="" /></h1>
          <i className="spark s1">✦</i><i className="spark s2">✦</i><i className="spark s3">✦</i><i className="spark s4">✦</i><i className="spark s5">✦</i>
        </div>
        <p className="subhead">Product Designer who can’t resist a good <button onPointerEnter={runChangeSequence} onPointerLeave={stopChangeSequence} className={`change interactive-word${changeGlitching ? " active" : ""}`}><span data-text={changeWord}>{changeWord}</span></button>.</p>
      </div>
      <div className="grid-floor" />
    </section>
  );
}

function Intro() {
  const ref = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    const copy = el.querySelector(".intro-copy");
    const photos = el.querySelectorAll(".intro-photo,.intro-photo-reveal");
    const ghost = el.querySelectorAll(".intro-ghost b,.intro-ghost-fill b");
    const ghostFrame = el.querySelector(".intro-ghost-fill");
    const copyX = gsap.quickTo(copy, "x", { duration: .7, ease: "power3.out" });
    const copyY = gsap.quickTo(copy, "y", { duration: .7, ease: "power3.out" });
    const photoX = gsap.quickTo(photos, "x", { duration: 1, ease: "power3.out" });
    const photoY = gsap.quickTo(photos, "y", { duration: 1, ease: "power3.out" });
    const ghostX = gsap.quickTo(ghost, "x", { duration: .85, ease: "power3.out" });
    const ghostY = gsap.quickTo(ghost, "y", { duration: .85, ease: "power3.out" });
    let moving = false;
    let arrivingFromGallery = false;
    let arrivingFromHeroParticles = false;
    let movingForward = true;
    let transitionComplete = false;
    let releaseTimer;
    let navigationTween;
    let introWipeClone;
    const wipeBeam = document.querySelector(".section-wipe-beam");
    const discoBall = document.querySelector(".section-disco-ball");
    const discoRays = document.querySelector(".section-disco-rays");
    const galleryStage = document.querySelector(".gallery-sticky");
    const removeIntroWipeClone = () => {
      if (!introWipeClone) return;
      gsap.killTweensOf(introWipeClone);
      introWipeClone.remove();
      introWipeClone = null;
    };
    const moveLight = (event) => {
      const bounds = el.getBoundingClientRect();
      const ghostBounds = ghostFrame.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
      el.style.setProperty("--ix", `${event.clientX - bounds.left}px`);
      el.style.setProperty("--iy", `${event.clientY - bounds.top}px`);
      el.style.setProperty("--gx", `${event.clientX - ghostBounds.left}px`);
      el.style.setProperty("--gy", `${event.clientY - ghostBounds.top}px`);
      // copyX(x * 6); // Text parallax temporarily disabled for comparison.
      // copyY(y * 5);
      photoX(x * 8);
      photoY(y * 6);
      // ghostX(x * 22);
      // ghostY(y * 17);
      el.classList.add("pointer-live");
    };
    const hideLight = () => {
      el.classList.remove("pointer-live");
      // copyX(0);
      // copyY(0);
      photoX(0);
      photoY(0);
      // ghostX(0);
      // ghostY(0);
    };
    const show = () => {
      gsap.fromTo(copy, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .62, ease: "power3.out", overwrite: true });
    };
    el.addEventListener("pointermove", moveLight);
    el.addEventListener("pointerleave", hideLight);
    const handoffLock = Observer.create({
      target: window,
      type: "wheel,touch,pointer",
      preventDefault: true,
      onChange: () => {
        if (!moving || !transitionComplete) return;
        clearTimeout(releaseTimer);
        releaseTimer = setTimeout(releaseHandoff, 220);
      }
    });
    handoffLock.disable();
    function releaseHandoff() {
      clearTimeout(releaseTimer);
      moving = false;
      transitionComplete = false;
      handoffLock.disable();
      window.dispatchEvent(new Event(movingForward ? "intro-gallery-handoff-ready" : "intro-hero-handoff-ready"));
    }
    const holdForGallery = () => {
      arrivingFromGallery = true;
      introObserver?.disable();
    };
    const releaseFromGallery = () => {
      arrivingFromGallery = false;
      show();
      introObserver?.enable();
    };
    const holdForHeroParticles = () => {
      arrivingFromHeroParticles = true;
      introObserver?.disable();
    };
    const releaseFromHeroParticles = () => {
      arrivingFromHeroParticles = false;
      show();
      introObserver?.enable();
    };
    const cancelHeroParticles = () => {
      arrivingFromHeroParticles = false;
      introObserver?.disable();
    };
    const holdForRail = () => {
      const hadHandoff = moving;
      navigationTween?.kill();
      if (wipeBeam) gsap.set(wipeBeam, { clearProps: "transform,opacity" });
      if (discoBall) gsap.set(discoBall, { clearProps: "transform,opacity" });
      if (discoRays) gsap.set(discoRays, { clearProps: "transform,opacity" });
      if (galleryStage) gsap.set(galleryStage, { clearProps: "clipPath,willChange" });
      removeIntroWipeClone();
      gsap.set(el, { clearProps: "opacity" });
      clearTimeout(releaseTimer);
      moving = false;
      transitionComplete = false;
      handoffLock.disable();
      introObserver?.disable();
      if (hadHandoff) {
        window.dispatchEvent(new Event(movingForward ? "intro-gallery-handoff-ready" : "intro-hero-handoff-ready"));
      }
    };
    const settleFromRail = (event) => {
      if (event.detail?.section !== "intro") return;
      arrivingFromGallery = false;
      show();
      introObserver?.enable();
    };
    window.addEventListener("gallery-intro-handoff-start", holdForGallery);
    window.addEventListener("gallery-intro-handoff-ready", releaseFromGallery);
    window.addEventListener("hero-intro-particles-start", holdForHeroParticles);
    window.addEventListener("hero-intro-particles-ready", releaseFromHeroParticles);
    window.addEventListener("hero-intro-particles-cancel", cancelHeroParticles);
    window.addEventListener("nav-rail-jump-start", holdForRail);
    window.addEventListener("nav-rail-arrive", settleFromRail);
    let introObserver;
    introObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      preventDefault: true,
      tolerance: 18,
      onChangeY: (self) => {
        if (moving || arrivingFromGallery) return;
        moving = true;
        transitionComplete = false;
        movingForward = self.deltaY > 0;
        introObserver.disable();
        handoffLock.enable();
        window.dispatchEvent(new Event(movingForward ? "intro-gallery-handoff-start" : "intro-hero-handoff-start"));
        const galleryScrub = ScrollTrigger.getById("gallery-scrub");
        const destination = movingForward
          ? galleryScrub
            ? galleryScrub.start + 3
            : "#gallery"
          : "#top";
        navigationTween?.kill();
        if (movingForward && wipeBeam && discoBall && discoRays) {
          gsap.set(wipeBeam, { yPercent: 0, opacity: 0 });
          gsap.set(discoBall, { left: "50vw", xPercent: -50, x: 0, y: -170, rotation: 0, opacity: 1 });
          gsap.set(discoRays, { xPercent: -50, scaleX: 1, scaleY: 1, rotation: 0, opacity: 0 });
          const lightScanStart = .78;
          const lightScanDuration = 1.75;
          const rayBounds = discoRays.getBoundingClientRect();
          const rayHeight = Math.max(1, rayBounds.height);
          const edgeTravel = rayHeight * 2;
          const revealStart = lightScanStart + lightScanDuration
            * Math.max(0, Math.min(1, (rayBounds.top + rayHeight - window.innerHeight) / edgeTravel));
          const revealDuration = lightScanDuration * Math.min(1, window.innerHeight / edgeTravel);
          if (galleryStage) gsap.set(galleryStage, { clipPath: "inset(100% 0 0 0)", willChange: "clip-path" });
          removeIntroWipeClone();
          introWipeClone = el.cloneNode(true);
          introWipeClone.removeAttribute("id");
          introWipeClone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
          introWipeClone.classList.remove("pointer-live");
          introWipeClone.setAttribute("aria-hidden", "true");
          document.body.appendChild(introWipeClone);
          gsap.set(introWipeClone, { position: "fixed", inset: 0, width: "100vw", height: "100svh", minHeight: 0, zIndex: 996, pointerEvents: "none", clipPath: "inset(0 0 0% 0)", willChange: "clip-path" });
          navigationTween = gsap.timeline({
            onComplete: () => {
              gsap.set(wipeBeam, { clearProps: "transform,opacity" });
              gsap.set(discoBall, { clearProps: "transform,opacity" });
              gsap.set(discoRays, { clearProps: "transform,opacity" });
              if (galleryStage) gsap.set(galleryStage, { clearProps: "clipPath,willChange" });
              removeIntroWipeClone();
              gsap.set(el, { clearProps: "opacity" });
              transitionComplete = true;
              clearTimeout(releaseTimer);
              releaseTimer = setTimeout(releaseHandoff, 220);
            }
          })
            .to(discoBall, { y: "13vh", duration: .92, ease: "bounce.out" }, 0)
            .to(discoRays, { opacity: .68, duration: .18, ease: "power1.out" }, .62)
            .to(discoRays, { scaleY: -1, duration: lightScanDuration, ease: "none" }, lightScanStart)
            .call(() => {
              const destinationY = typeof destination === "number"
                ? destination
                : document.querySelector(destination)?.offsetTop ?? 0;
              window.scrollTo(0, destinationY);
            }, null, revealStart)
            .to(introWipeClone, { clipPath: "inset(0 0 100% 0)", duration: revealDuration, ease: "none" }, revealStart)
            .to(galleryStage, { clipPath: "inset(0% 0 0 0)", duration: revealDuration, ease: "none" }, revealStart)
            .to(discoRays, { opacity: 0, duration: .52, ease: "power2.out" }, lightScanStart + lightScanDuration)
            .to(discoBall, { y: -170, opacity: 0, duration: .65, ease: "power2.in" }, lightScanStart + lightScanDuration + .1);
          return;
        }
        navigationTween = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          onComplete: () => {
            transitionComplete = true;
            clearTimeout(releaseTimer);
            releaseTimer = setTimeout(releaseHandoff, 220);
          }
        })
          .to(copy, { opacity: 0, y: movingForward ? -18 : 18, duration: .38 }, 0)
          .to(window, { scrollTo: destination, duration: 1.05 }, .04);
      }
    });
    introObserver.disable();
    const trigger = ScrollTrigger.create({
      id: "intro-section",
      trigger: el,
      start: "top top+=2",
      end: "bottom top",
      onEnter: () => { if (!arrivingFromHeroParticles) show(); if (!arrivingFromGallery && !arrivingFromHeroParticles) introObserver.enable(); },
      onEnterBack: () => { if (!arrivingFromHeroParticles) show(); if (!arrivingFromGallery && !arrivingFromHeroParticles) introObserver.enable(); },
      onLeave: () => introObserver.disable(),
      onLeaveBack: () => introObserver.disable()
    });
    return () => {
      el.removeEventListener("pointermove", moveLight);
      el.removeEventListener("pointerleave", hideLight);
      window.removeEventListener("gallery-intro-handoff-start", holdForGallery);
      window.removeEventListener("gallery-intro-handoff-ready", releaseFromGallery);
      window.removeEventListener("hero-intro-particles-start", holdForHeroParticles);
      window.removeEventListener("hero-intro-particles-ready", releaseFromHeroParticles);
      window.removeEventListener("hero-intro-particles-cancel", cancelHeroParticles);
      window.removeEventListener("nav-rail-jump-start", holdForRail);
      window.removeEventListener("nav-rail-arrive", settleFromRail);
      clearTimeout(releaseTimer);
      navigationTween?.kill();
      if (wipeBeam) gsap.set(wipeBeam, { clearProps: "transform,opacity" });
      if (discoBall) gsap.set(discoBall, { clearProps: "transform,opacity" });
      if (discoRays) gsap.set(discoRays, { clearProps: "transform,opacity" });
      if (galleryStage) gsap.set(galleryStage, { clearProps: "clipPath,willChange" });
      removeIntroWipeClone();
      gsap.set(el, { clearProps: "opacity" });
      handoffLock.kill();
      introObserver.kill();
      trigger.kill();
    };
  }, []);
  return (
    <section className="intro dark" id="intro" ref={ref}>
      <img className="intro-photo" src="/media/intro/me-in-disco-landscape.png" alt="Sri Harsha in a disco-inspired portrait" />
      <div className="intro-photo-shade" aria-hidden="true" />
      <div className="intro-ghost" aria-hidden="true"><span><b>CONTROL</b></span></div>
      <div className="intro-ghost-fill" aria-hidden="true"><span><b>CONTROL</b></span></div>
      <img className="intro-photo-reveal" src="/media/intro/me-in-disco-landscape.png" alt="" aria-hidden="true" />
      <div className="intro-grain" aria-hidden="true" />
      <div className="intro-divider" aria-hidden="true" />
      <div className="intro-viewfinder" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="intro-dust" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i><i>✦</i><i>✦</i></div>
      <div className="intro-copy">
        <div className="intro-body">
          <p>A year at Credain, designing treasury and settlement products, flows where people are constantly deciding what to do with their money, and one unclear moment changes that decision. I focused on clarity: predictable systems, obvious next steps, less second-guessing.</p>
          <p>Right now, I&apos;m mentored by UX Anudeep on AI product design and systems thinking, and on my own, chasing motion and interaction design, the details that make a screen feel alive.</p>
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [seekActive, setSeekActive] = useState(0);
  const section = useRef(null);
  const track = useRef(null);
  const visual = useRef(null);
  const cassetteCanvas = useRef(null);
  const phoneReveal = useRef(null);
  const phoneTarget = useRef(null);
  const transitionUi = useRef(null);
  const cassetteLabelStrip = useRef(null);
  const cassetteLabel = useRef(null);
  const cassetteBeam = useRef(null);
  const beamTimer = useRef(null);
  const lastBeamProject = useRef("");
  const activeRef = useRef(0);
  const workLocked = useRef(false);
  const lightCassetteLabel = (name) => {
    const label = cassetteLabel.current;
    const beam = cassetteBeam.current;
    if (!label || !beam) return;
    const changingProject = Boolean(lastBeamProject.current && lastBeamProject.current !== name);
    lastBeamProject.current = name;
    window.clearTimeout(beamTimer.current);
    beam.classList.remove("is-active");
    beamTimer.current = window.setTimeout(() => beam.classList.add("is-active"), changingProject ? 130 : 16);
    label.textContent = name;
    label.setAttribute("aria-label", name);
  };
  const dimCassetteLabel = () => {
    const label = cassetteLabel.current;
    if (!label) return;
    window.clearTimeout(beamTimer.current);
    cassetteBeam.current?.classList.remove("is-active");
    label.textContent = "";
    label.removeAttribute("aria-label");
  };
  const goToProject = (next) => {
    const target = Math.max(0, Math.min(projects.length - 1, next));
    if (target === activeRef.current || workLocked.current) return;
    if (prefersReducedMotion()) {
      activeRef.current = target;
      setActive(target);
      setSeekActive(target);
      return;
    }
    workLocked.current = true;
    const direction = target > activeRef.current ? 1 : -1;
    const disc = transitionUi.current?.querySelector(".work-disc");
    const meta = transitionUi.current?.querySelector(".phone-meta");
    gsap.timeline({ onComplete: () => { workLocked.current = false; } })
      .to(disc, { xPercent: -118 * direction, rotation: -145 * direction, duration: .42, ease: "power2.in" }, 0)
      .to(meta, { opacity: .42, duration: .2, ease: "power2.in" }, 0)
      .add(() => { activeRef.current = target; setActive(target); })
      .set(disc, { xPercent: 118 * direction, rotation: 145 * direction })
      .to(disc, { xPercent: 0, rotation: 0, duration: .56, ease: "power3.out" })
      .to(meta, { opacity: 1, duration: .32, ease: "power2.out" }, "<.12")
      .add(() => setSeekActive(target), 1.16);
  };
  const openProject = (event) => {
    event.preventDefault();
    const href = event.currentTarget.href;
    const navigate = () => router.push(new URL(href).pathname);
    if (document.startViewTransition) document.startViewTransition(navigate);
    else navigate();
  };
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let transitioning = false;
    let returningFromAbout = false;
    let arrivingFromIntro = false;
    let railJumping = false;
    let landingOnIntro = false;
    let introLandingComplete = false;
    let introReleaseTimer;
    let returnSettleTimer;
    let returnPhoneClone;
    let pausedReturnDiscs = [];
    let lastScrollIntent = 0;
    let lastScrollIntentAt = 0;
    let transitionLock;
    let projectObserver;
    let storyTimeline;
    let stateTimeline;
    const setWorkMode = (active) => section.current?.classList.toggle("is-work-mode", active);
    const resumeReturnDiscMotion = () => {
      pausedReturnDiscs.forEach((disc) => disc.style.removeProperty("animation-play-state"));
      pausedReturnDiscs = [];
    };
    const removeReturnPhoneClone = () => {
      if (returnPhoneClone) {
        gsap.killTweensOf(returnPhoneClone);
        returnPhoneClone.remove();
        returnPhoneClone = null;
      }
      resumeReturnDiscMotion();
    };
    const stageWorkReturn = () => {
      returningFromAbout = true;
      clearTimeout(returnSettleTimer);
      removeReturnPhoneClone();
      // Keep the real page-level Work labels out of the reverse transition.
      // They are revealed only after the viewport has actually landed.
      gsap.killTweensOf(".gallery-work-chrome");
      gsap.set(".gallery-work-chrome", { opacity: 0, y: 0, pointerEvents: "none" });
      pausedReturnDiscs = Array.from(phoneReveal.current.querySelectorAll(".work-disc .artwork"));
      const frozenDiscTransforms = pausedReturnDiscs.map((disc) => getComputedStyle(disc).transform);
      // Use layout dimensions: getBoundingClientRect() includes the 24% exit
      // transform and would create a double-scaled return clone.
      const realSceneWidth = phoneReveal.current.offsetWidth;
      const realSceneHeight = phoneReveal.current.offsetHeight;
      pausedReturnDiscs.forEach((disc) => { disc.style.animationPlayState = "paused"; });
      returnPhoneClone = phoneReveal.current.cloneNode(true);
      returnPhoneClone.classList.add("gallery-return-clone");
      returnPhoneClone.setAttribute("aria-hidden", "true");
      // The fixed clone carries only the phone/hand visual. External Work
      // chrome is restored after the complete scene handoff, not inside it.
      returnPhoneClone.querySelectorAll(".gallery-work-chrome").forEach((node) => node.remove());
      returnPhoneClone.querySelectorAll(".work-disc .artwork").forEach((disc, index) => {
        disc.style.animation = "none";
        disc.style.transform = frozenDiscTransforms[index] || "none";
      });
      document.body.appendChild(returnPhoneClone);
      gsap.set(returnPhoneClone, {
        position: "fixed",
        inset: 0,
        // 100vw includes the scrollbar while the real sticky scene does not.
        // Matching its measured box prevents a small horizontal/scale snap.
        width: realSceneWidth,
        height: realSceneHeight,
        zIndex: 29,
        pointerEvents: "none",
        opacity: 1,
        x: "31vw",
        y: "-6vh",
        scale: .24,
        rotation: 8,
        transformOrigin: "center center"
      });
    };
    const killGalleryMotion = () => {
      storyTimeline?.kill();
      stateTimeline?.kill();
      storyTimeline = null;
      stateTimeline = null;
      const chrome = document.querySelectorAll(".gallery-work-chrome");
      gsap.killTweensOf([visual.current, cassetteCanvas.current, phoneReveal.current, transitionUi.current, ...chrome]);
    };
    const resetTransition = () => {
      killGalleryMotion();
      transitioning = false;
      returningFromAbout = false;
      transitionLock?.disable();
      projectObserver?.disable();
      workLocked.current = false;
      clearTimeout(returnSettleTimer);
      removeReturnPhoneClone();
      setWorkMode(false);
      gsap.set(visual.current, { opacity: 1, clearProps: "transform,borderRadius,backgroundColor,pointerEvents" });
      gsap.set(cassetteCanvas.current, { clearProps: "transform" });
      gsap.set(phoneReveal.current, { opacity: 0, clearProps: "transform" });
      gsap.set(transitionUi.current, { opacity: 0, xPercent: 100, y: 0 });
      gsap.set(".gallery-work-chrome", { opacity: 0, y: 16, pointerEvents: "none" });
    };
    const launchPhoneTransition = () => {
      if (transitioning) return;
      transitioning = true;
      setWorkMode(true);
      transitionLock.enable();
      gsap.set(visual.current, { opacity: 1, pointerEvents: "auto" });
      gsap.set(phoneReveal.current, { opacity: 1 });
      gsap.set(cassetteCanvas.current, { xPercent: 0 });
      gsap.set(transitionUi.current, { opacity: 0, xPercent: 100, y: 0 });
      const sourceRect = visual.current.getBoundingClientRect();
      const targetRect = phoneTarget.current.getBoundingClientRect();
      const scale = targetRect.width / sourceRect.width;
      const targetX = targetRect.left - sourceRect.left;
      const targetY = targetRect.top + (targetRect.height - sourceRect.height * scale) / 2 - sourceRect.top;
      const zoom = gsap.to(visual.current, {
        x: targetX,
        y: targetY,
        scale,
        duration: 1.15,
        ease: "power3.inOut"
      });
      storyTimeline = gsap.timeline({
        onComplete: () => {
          gsap.to(".gallery-work-chrome", {
            opacity: 1,
            y: 0,
            pointerEvents: "auto",
            duration: .45,
            stagger: .06,
            ease: "power2.out",
            onComplete: () => {
              workLocked.current = false;
              transitionLock.disable();
              projectObserver.enable();
            }
          });
        }
      })
        .add(zoom, 0)
        .to(visual.current, { borderRadius: "7% / 3.5%", duration: 1.15, ease: "power3.inOut" }, 0)
        .set(visual.current, { backgroundColor: "transparent" }, 1.08)
        .to(cassetteCanvas.current, { xPercent: -110, duration: .72, ease: "power3.inOut" }, 1.08)
        .to(transitionUi.current, { opacity: 1, xPercent: 0, duration: .72, ease: "power3.inOut" }, 1.08)
        .set(visual.current, { opacity: 0, pointerEvents: "none" }, 1.8)
        .to({}, { duration: .12 });
    };
    transitionLock = Observer.create({
      target: window,
      type: "wheel,touch,pointer",
      preventDefault: true,
      onChange: () => {
        if (!landingOnIntro || !introLandingComplete) return;
        clearTimeout(introReleaseTimer);
        introReleaseTimer = setTimeout(() => {
          landingOnIntro = false;
          transitionLock.disable();
          window.dispatchEvent(new Event("gallery-intro-handoff-ready"));
        }, 220);
      }
    });
    transitionLock.disable();
    const intentObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      onChangeY: (self) => {
        lastScrollIntent = Math.sign(self.deltaY);
        lastScrollIntentAt = performance.now();
      }
    });
    const exitToAbout = () => {
      if (workLocked.current) return;
      workLocked.current = true;
      setWorkMode(true);
      window.dispatchEvent(new Event("work-about-handoff-start"));
      projectObserver.disable();
      window.dispatchEvent(new CustomEvent("show-life-outside", { detail: { fromWork: true } }));
      stateTimeline?.kill();
      // A staggered Work-chrome entrance may still have delayed children.
      // Cancel them before the exit so removed chrome cannot flash back in.
      gsap.killTweensOf(".gallery-work-chrome");
      stateTimeline = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          workLocked.current = false;
          window.dispatchEvent(new Event("life-outside-takeover-complete"));
        }
      })
        .to(".gallery-work-chrome", { opacity: 0, y: -16, pointerEvents: "none", duration: .35 }, 0)
        .to(".about-stage", { opacity: 1, duration: .38, ease: "power2.out" }, .45)
        .to(phoneReveal.current, { x: "31vw", y: "-6vh", scale: .24, rotation: 8, duration: 1.05 }, 0)
        .to(window, { scrollTo: "#about", duration: 1.05 }, 0);
    };
    const returnToGallery = () => {
      if (workLocked.current) return;
      workLocked.current = true;
      projectObserver.disable();
      transitionLock.enable();
      gsap.set(visual.current, { opacity: 1, pointerEvents: "auto" });
      stateTimeline?.kill();
      stateTimeline = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          transitioning = false;
          workLocked.current = false;
          transitionLock.disable();
          setWorkMode(false);
          gsap.set(phoneReveal.current, { opacity: 0, clearProps: "transform" });
          gsap.set(transitionUi.current, { opacity: 0, xPercent: 100 });
          gsap.set(visual.current, { clearProps: "transform,borderRadius,backgroundColor,pointerEvents" });
          gsap.set(cassetteCanvas.current, { clearProps: "transform" });
        }
      })
        .to(".gallery-work-chrome", { opacity: 0, y: 16, pointerEvents: "none", duration: .35 }, 0)
        .to(transitionUi.current, { opacity: 0, xPercent: 100, duration: .72 }, .08)
        .to(cassetteCanvas.current, { xPercent: 0, duration: .72 }, .08)
        .set(visual.current, { backgroundColor: "#fff" }, .8)
        .to(visual.current, { x: 0, y: 0, scale: 1, borderRadius: 0, duration: 1.15 }, .8)
        .to(phoneReveal.current, { opacity: 0, duration: .35, ease: "power2.out" }, 1.55);
    };
    projectObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      preventDefault: true,
      tolerance: 22,
      wheelSpeed: 1,
      onChangeY: (self) => {
        if (workLocked.current) return;
        if (self.deltaY > 0) {
          if (activeRef.current < projects.length - 1) goToProject(activeRef.current + 1);
          else exitToAbout();
        } else if (activeRef.current > 0) {
          goToProject(activeRef.current - 1);
        } else {
          returnToGallery();
        }
      }
    });
    projectObserver.disable();
    const prepareWorkReturn = () => stageWorkReturn();
    const prepareIntroArrival = () => { arrivingFromIntro = true; };
    const finishIntroArrival = () => { arrivingFromIntro = false; };
    const openGalleryFromRail = () => resetTransition();
    const holdForRailJump = (event) => {
      railJumping = true;
      const gallery = ScrollTrigger.getById("gallery-scrub");
      const workY = gallery ? gallery.start + (gallery.end - gallery.start) * .74 : 0;
      const destination = event.detail?.section;
      const fromY = event.detail?.fromY ?? window.scrollY;
      if (destination === "work") {
        returningFromAbout = fromY > workY && transitioning;
      } else if (destination === "top" || destination === "intro" || destination === "gallery") {
        resetTransition();
        railJumping = true;
      } else {
        returningFromAbout = false;
        if (destination === "about" || destination === "contact") {
          projectObserver.disable();
          stateTimeline?.kill();
          gsap.killTweensOf(".gallery-work-chrome");
          gsap.set(".gallery-work-chrome", { opacity: 0, y: 0, pointerEvents: "none" });
        }
      }
    };
    const releaseFromRailJump = () => { railJumping = false; };
    const resumeWork = () => {
      if (!returningFromAbout) {
        launchPhoneTransition();
        return;
      }
      workLocked.current = true;
      transitionLock.enable();
      setWorkMode(true);
      gsap.set(visual.current, { opacity: 0, pointerEvents: "none" });
      gsap.set(cassetteCanvas.current, { xPercent: -110 });
      gsap.set(phoneReveal.current, { opacity: returnPhoneClone ? 0 : 1 });
      gsap.set(transitionUi.current, { opacity: 1, xPercent: 0 });
      stateTimeline?.kill();
      const returningVisual = returnPhoneClone || phoneReveal.current;
      const deferChromeReveal = Boolean(returnPhoneClone);
      if (deferChromeReveal) {
        gsap.killTweensOf(".gallery-work-chrome");
        gsap.set(".gallery-work-chrome", { opacity: 0, y: 0, pointerEvents: "none" });
      }
      stateTimeline = gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          gsap.set(phoneReveal.current, { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 });
          removeReturnPhoneClone();
          workLocked.current = false;
          transitionLock.disable();
          projectObserver.enable();
          window.dispatchEvent(new Event("gallery-work-return-complete"));
          // Keep the return guard alive through ScrollTrigger's landing update;
          // otherwise onEnterBack can reset the phone into Gallery mode.
          clearTimeout(returnSettleTimer);
          returnSettleTimer = setTimeout(() => { returningFromAbout = false; }, 180);
        }
      })
        .to(returningVisual, { x: 0, y: 0, scale: 1, rotation: 0, duration: 1.05 }, 0)
        .to(phoneReveal.current, { x: 0, y: 0, scale: 1, rotation: 0, duration: 1.05 }, 0);
      if (!deferChromeReveal) {
        stateTimeline.to(".gallery-work-chrome", { opacity: 1, y: 0, pointerEvents: "auto", duration: .45, stagger: .06 }, .62);
      }
    };
    const settleReturnedWorkChrome = (event) => {
      if (event.detail?.section !== "work") return;
      gsap.killTweensOf(".gallery-work-chrome");
      gsap.fromTo(".gallery-work-chrome",
        { opacity: 0, y: 10, pointerEvents: "none" },
        { opacity: 1, y: 0, pointerEvents: "auto", duration: .34, stagger: .04, ease: "power2.out", overwrite: true }
      );
    };
    const openWorkFromRail = () => resumeWork();
    window.addEventListener("prepare-gallery-work-return", prepareWorkReturn);
    window.addEventListener("resume-gallery-work", resumeWork);
    window.addEventListener("work-about-handoff-complete", settleReturnedWorkChrome);
    window.addEventListener("intro-gallery-handoff-start", prepareIntroArrival);
    window.addEventListener("intro-gallery-handoff-ready", finishIntroArrival);
    window.addEventListener("nav-open-work", openWorkFromRail);
    window.addEventListener("nav-open-gallery", openGalleryFromRail);
    window.addEventListener("nav-rail-jump-start", holdForRailJump);
    window.addEventListener("nav-rail-jump-ready", releaseFromRailJump);
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          id: "gallery-scrub",
          trigger: section.current,
          pin: ".gallery-sticky",
          start: "top top",
          end: "+=400%",
          scrub: .65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!railJumping && self.progress >= .74 && self.direction > 0) launchPhoneTransition();
          },
          onRefresh: (self) => {
            if (self.progress < .5) resetTransition();
          },
          // Re-entering Gallery from Intro must always start in scrub mode.
          // Without this reset, a previously enabled Work observer can keep
          // consuming wheel input and make the cassette appear frozen.
          onEnter: () => {
            if (!railJumping && !returningFromAbout && !section.current.classList.contains("is-work-mode")) resetTransition();
          },
          onEnterBack: () => {
            // The About -> Work landing crosses this boundary too. In that
            // case Work already owns the scene, so resetting here causes the
            // restored chrome to appear for a frame and disappear again.
            if (!railJumping && !returningFromAbout && !section.current.classList.contains("is-work-mode")) resetTransition();
          },
          onLeaveBack: () => {
            const isRealUpwardGesture = lastScrollIntent < 0 && performance.now() - lastScrollIntentAt < 500;
            if (arrivingFromIntro || railJumping || !isRealUpwardGesture) return;
            resetTransition();
            landingOnIntro = true;
            introLandingComplete = false;
            clearTimeout(introReleaseTimer);
            window.dispatchEvent(new Event("gallery-intro-handoff-start"));
            transitionLock.enable();
            gsap.to(window, {
              scrollTo: "#intro",
              duration: .68,
              ease: "power3.out",
              overwrite: true,
              onComplete: () => {
                introLandingComplete = true;
                clearTimeout(introReleaseTimer);
                introReleaseTimer = setTimeout(() => {
                  landingOnIntro = false;
                  transitionLock.disable();
                  window.dispatchEvent(new Event("gallery-intro-handoff-ready"));
                }, 220);
              }
            });
          }
        }
      })
        .to(track.current, { xPercent: -50, duration: 3, ease: "none" }, 0)
        .to(".moving-perforations i", { backgroundPositionX: "-50vw", duration: 3, ease: "none" }, 0)
        .to(".svg-reel-left", { rotation: 960, duration: 3, ease: "none" }, 0)
        .to(".svg-reel-right", { rotation: -960, duration: 3, ease: "none" }, 0)
        .to({}, { duration: 1 });
    }, section);
    return () => {
      window.removeEventListener("prepare-gallery-work-return", prepareWorkReturn);
      window.removeEventListener("resume-gallery-work", resumeWork);
      window.removeEventListener("work-about-handoff-complete", settleReturnedWorkChrome);
      window.removeEventListener("intro-gallery-handoff-start", prepareIntroArrival);
      window.removeEventListener("intro-gallery-handoff-ready", finishIntroArrival);
      window.removeEventListener("nav-open-work", openWorkFromRail);
      window.removeEventListener("nav-open-gallery", openGalleryFromRail);
      window.removeEventListener("nav-rail-jump-start", holdForRailJump);
      window.removeEventListener("nav-rail-jump-ready", releaseFromRailJump);
      clearTimeout(introReleaseTimer);
      clearTimeout(returnSettleTimer);
      window.clearTimeout(beamTimer.current);
      killGalleryMotion();
      removeReturnPhoneClone();
      setWorkMode(false);
      transitionLock.kill();
      intentObserver.kill();
      projectObserver.kill();
      ctx.revert();
    };
  }, []);
  const p = projects[active];
  const playerProgress = ((seekActive + 1) / projects.length) * 100;
  const playerAccent = {
    blue: "#6e7fe0",
    red: "#b33b4e",
    silver: "#bcbdbb",
    violet: "#8d6ed7"
  }[p.tone];
  return (
    <section className="gallery-scroll" ref={section} id="gallery">
      <div className="gallery-sticky">
        <div className="gallery-phone-reveal" ref={phoneReveal}>
          <img src="/media/gallery/hand-phone.png" alt="" />
          <header className="section-head gallery-work-chrome"><span>02 / Selected work</span><span>{p.id} of {String(projects.length).padStart(2, "0")}</span></header>
          <div className="gallery-phone-target" ref={phoneTarget}>
            <div className="gallery-transition-ui" ref={transitionUi} style={{ "--player-accent": playerAccent, "--player-progress": playerProgress + "%", "--seek-angle": playerProgress * 3.6 + "deg" }}>
              <div className="phone-status"><span>9:41</span><span>● ◒</span></div>
              <div className="player-kicker"><span>PORTFOLIO PLAYER</span><b>{p.id} / {String(projects.length).padStart(2, "0")}</b></div>
              <div className="phone-meta"><span>{p.sector}</span><strong>{p.title}</strong></div>
              <div className="player-readout" aria-hidden="true"><i /><i /><i /><i /></div>
              <div className="work-disc-stage">
                <div className={"work-disc work-disc-" + p.tone}><Artwork {...p} /></div>
                <div className="work-seek-ring" style={{ "--ring-progress": playerProgress + "%" }} aria-hidden="true" />
                <div className="work-seek-marker" aria-hidden="true"><i /></div>
              </div>
              <div className="controls player-transport">
                <button onClick={() => goToProject(activeRef.current - 1)} disabled={active === 0} aria-label="Previous project"><SkipBack size={17} weight="fill" aria-hidden="true" /></button>
                <a href={"/work/" + p.title.toLowerCase().replaceAll(" ", "-")} onClick={openProject} className="play" aria-label={"Open " + p.title + " case study"}><Play size={14} weight="fill" aria-hidden="true" /></a>
                <button onClick={() => goToProject(activeRef.current + 1)} disabled={active === projects.length - 1} aria-label="Next project"><SkipForward size={17} weight="fill" aria-hidden="true" /></button>
              </div>
            </div>
          </div>
          <div className="work-title gallery-work-chrome"><span>TRACK {p.id}</span><h2>{p.title}</h2><p>{p.sector}</p></div>
          <div className="project-dots gallery-work-chrome">{projects.map((project, i) => <button key={project.id} onClick={() => goToProject(i)} className={active === i ? "active" : ""} aria-label={"Show " + project.title} />)}</div>
        </div>
        <div className="gallery-visual" ref={visual}>
          <div className="cassette-canvas" ref={cassetteCanvas}>
            <img className="cassette-art" src="/media/gallery/cassette-without-strip.svg" alt="Cassette body with two chrome reels" />
            <div className="hover-beam" ref={cassetteBeam} aria-hidden="true">
              <div className="beam-glitter">{gallerySparkles.map((style, index) => <i style={style} key={index} />)}</div>
            </div>
            <div className="moving-strip-base" aria-hidden="true" />
            <div className="moving-perforations" aria-hidden="true"><i /><i /></div>
            <div className="svg-reel svg-reel-left" aria-hidden="true"><img src="/media/gallery/cassette-transparent.svg" alt="" /></div>
            <div className="svg-reel svg-reel-right" aria-hidden="true"><img src="/media/gallery/cassette-transparent.svg" alt="" /></div>
            {/* TODO(content): replace with muted, playsInline project videos plus viewport play/pause handling. */}
            <div className="film-mask supplied-film-mask"><div className="film-track" ref={track}>{galleryItems.concat(galleryItems).map((title, i) => <article data-content-status="placeholder" data-project-name={title} className={"gallery-frame film-frame art-" + (i % 5)} onMouseEnter={() => lightCassetteLabel(title)} onMouseLeave={dimCassetteLabel} key={title + i}><div className="fake-motion"><b>{String(i % 5 + 1).padStart(2, "0")}</b><span /></div></article>)}</div></div>
            <div className="cassette-label-strip" ref={cassetteLabelStrip}>
              <div className="cassette-label" ref={cassetteLabel} aria-live="polite" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Artwork({ tone, id }) {
  return <div className={"artwork artwork-" + tone}><span>TRACK<br />{id}</span><i /></div>;
}

function Work() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const phoneStage = useRef(null);
  const phoneUi = useRef(null);
  const activeRef = useRef(0);
  const locked = useRef(false);
  const goTo = (next) => {
    const target = Math.max(0, Math.min(projects.length - 1, next));
    if (target === activeRef.current || locked.current) return;
    if (prefersReducedMotion()) {
      activeRef.current = target;
      setActive(target);
      return;
    }
    locked.current = true;
    const direction = target > activeRef.current ? 1 : -1;
    const pieces = phoneUi.current.querySelectorAll(".artwork,.phone-meta,.progress");
    gsap.timeline({ onComplete: () => { locked.current = false; } })
      .to(pieces, { y: -14 * direction, opacity: 0, duration: .24, stagger: .025, ease: "power2.in" })
      .add(() => { activeRef.current = target; setActive(target); })
      .set(pieces, { y: 16 * direction })
      .to(pieces, { y: 0, opacity: 1, duration: .42, stagger: .035, ease: "power3.out" });
  };
  const change = (dir) => goTo(activeRef.current + dir);
  const openProject = (event) => {
    event.preventDefault();
    const href = event.currentTarget.href;
    const navigate = () => router.push(new URL(href).pathname);
    if (document.startViewTransition) document.startViewTransition(navigate);
    else navigate();
  };
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const section = sectionRef.current;
    let workObserver;
    const exitToAbout = () => {
      if (locked.current) return;
      locked.current = true;
      gsap.timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => { locked.current = false; workObserver.disable(); }
      })
        .to(".work-title,.project-dots", { opacity: 0, y: -16, duration: .35 }, 0)
        .to(phoneStage.current, { x: "31vw", y: "-6vh", scale: .24, rotation: 8, duration: 1.05 }, 0)
        .to(window, { scrollTo: "#about", duration: 1.05 }, 0);
    };
    workObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      preventDefault: true,
      tolerance: 22,
      wheelSpeed: 1,
      onChangeY: (self) => {
        if (locked.current) return;
        if (self.deltaY > 0) {
          if (activeRef.current < projects.length - 1) goTo(activeRef.current + 1);
          else exitToAbout();
        } else if (activeRef.current > 0) {
          goTo(activeRef.current - 1);
        } else {
          workObserver.disable();
          const galleryScrub = ScrollTrigger.getById("gallery-scrub");
          gsap.to(window, { scrollTo: galleryScrub ? galleryScrub.end - 2 : "#gallery", duration: .9, ease: "power3.inOut" });
        }
      }
    });
    workObserver.disable();
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top+=2",
      end: "bottom top",
      onEnter: () => workObserver.enable(),
      onEnterBack: () => {
        gsap.set(phoneStage.current, { clearProps: "transform,opacity,filter" });
        gsap.set(".work-title,.project-dots", { clearProps: "transform,opacity" });
        workObserver.enable();
      },
      onLeave: () => workObserver.disable(),
      onLeaveBack: () => workObserver.disable()
    });
    return () => { workObserver.kill(); trigger.kill(); };
  }, []);
  const p = projects[active];
  return (
    <section className="work dark" id="work" ref={sectionRef}>
      <header className="section-head"><span>02 / Selected work</span><span>{p.id} of {String(projects.length).padStart(2, "0")}</span></header>
      <div className="phone-stage" ref={phoneStage}>
        <img src="/media/work/hand-phone.png" alt="A hand holding a phone" />
        <div className="phone-ui" ref={phoneUi}>
          <div className="phone-status"><span>9:41</span><span>● ◒</span></div>
          <div className="phone-label">NOW PLAYING</div>
          <Artwork {...p} />
          <div className="phone-meta"><strong>{p.title}</strong><span>{p.sector}</span></div>
          <div className="progress"><i /><b /></div>
          <div className="controls">
            <button onClick={() => change(-1)} disabled={active === 0} aria-label="Previous project"><SkipBack size={17} weight="fill" aria-hidden="true" /></button>
            <a href={"/work/" + p.title.toLowerCase().replaceAll(" ", "-")} onClick={openProject} className="play" aria-label={"Open " + p.title + " case study"}><Play size={14} weight="fill" aria-hidden="true" /></a>
            <button onClick={() => change(1)} disabled={active === projects.length - 1} aria-label="Next project"><SkipForward size={17} weight="fill" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      <div className="work-title"><span>TRACK {p.id}</span><h2>{p.title}</h2><p>{p.sector}</p></div>
      <div className="project-dots">{projects.map((project, i) => <button key={project.id} onClick={() => goTo(i)} className={active === i ? "active" : ""} aria-label={"Show " + project.title} />)}</div>
    </section>
  );
}

function About() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const aboutScene = el.querySelector(".about-stage");
    const heading = el.querySelector("h2");
    const collageStage = el.querySelector(".collage");
    const cards = Array.from(el.querySelectorAll(".collage-card"));
    const spotlight = el.querySelector(".about-spotlight");
    let spotlightCard = null;
    let moving = false;
    let zone = "inactive";
    let railJumping = false;
    let settleTimer;
    let continuousArrivalPending = false;
    let continuousSceneWaiting = false;
    let reverseScrollComplete = false;
    let reversePhoneComplete = false;
    let reverseLandingFrame;
    let reverseScrollBehavior;
    let reverseScrollBehaviorCaptured = false;
    let entranceTween;
    let navigationTween;
    if (prefersReducedMotion()) return;
    const showAbout = (event) => {
      if (entranceTween?.isActive()) return;
      const arrivingFromWork = Boolean(event?.detail?.fromWork);
      gsap.killTweensOf([aboutScene, heading, collageStage, ...cards]);
      if (arrivingFromWork) {
        continuousArrivalPending = true;
        continuousSceneWaiting = true;
        gsap.set([heading, collageStage, ...cards], { clearProps: "opacity,transform,transformOrigin" });
        gsap.set(cards, { opacity: 0 });
        gsap.set(aboutScene, {
          position: "fixed",
          left: 0,
          top: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 30,
          pointerEvents: "none",
          x: "-31vw",
          y: "-6vh",
          scale: .24,
          rotation: -8,
          opacity: 0,
          transformOrigin: "center center"
        });
        return;
      }
      entranceTween = gsap.timeline({
        onComplete: () => {
          gsap.set(heading, { clearProps: "opacity,transform" });
          gsap.set(cards, { clearProps: "opacity,transform" });
        }
      })
        .fromTo(heading, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .5, ease: "power3.out" }, 0)
        .fromTo(cards, {
          y: -45,
          opacity: 0,
          scale: .96,
          rotation: (i) => i % 2 ? -10 : 11
        }, {
          y: 0,
          opacity: .58,
          scale: 1,
          rotation: (i, card) => parseFloat(getComputedStyle(card).getPropertyValue("--rot")) || 0,
          stagger: .065,
          duration: .72,
          ease: "back.out(1.3)"
        }, .08);
    };
    const aimSpotlight = (card) => {
      const sectionRect = el.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const sourceX = sectionRect.width / 2;
      const targetX = cardRect.left - sectionRect.left + cardRect.width / 2;
      const targetY = cardRect.top - sectionRect.top + cardRect.height / 2;
      const deltaX = targetX - sourceX;
      const angle = -Math.atan2(deltaX, targetY) * 180 / Math.PI;
      spotlight.style.setProperty("--spot-angle", angle + "deg");
      spotlight.style.setProperty("--spot-length", Math.hypot(deltaX, targetY) + cardRect.height * .55 + "px");
      spotlight.style.setProperty("--spot-width", cardRect.width * 1.35 + "px");
    };
    const showSpotlight = (event) => {
      spotlightCard = event.currentTarget;
      aimSpotlight(spotlightCard);
      spotlight.classList.add("is-active");
    };
    const hideSpotlight = (event) => {
      if (spotlightCard !== event.currentTarget) return;
      spotlightCard = null;
      requestAnimationFrame(() => {
        if (!spotlightCard) spotlight.classList.remove("is-active");
      });
    };
    cards.forEach((card) => {
      card.addEventListener("pointerenter", showSpotlight);
      card.addEventListener("pointerleave", hideSpotlight);
    });
    const move = (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.querySelectorAll(".collage-card").forEach((card) => {
        const depth = card.dataset.depth === "front" ? 22 : card.dataset.depth === "mid" ? 12 : 5;
        card.style.setProperty("--px", x * depth + "px"); card.style.setProperty("--py", y * depth + "px");
      });
      if (spotlightCard) aimSpotlight(spotlightCard);
    };
    const releaseAboutStage = () => {
      entranceTween?.kill();
      continuousSceneWaiting = false;
      continuousArrivalPending = false;
      gsap.set(aboutScene, { clearProps: "position,left,top,width,height,zIndex,pointerEvents,opacity,transform,transformOrigin" });
    };
    const finishReverseReturn = () => {
      if (!reverseScrollComplete || !reversePhoneComplete) return;
      reverseScrollComplete = false;
      reversePhoneComplete = false;
      moving = false;
      zone = "inactive";
      gsap.set(aboutScene, {
        clearProps: "position,left,top,width,height,zIndex,pointerEvents,opacity,transform,transformOrigin"
      });
      if (reverseScrollBehaviorCaptured) {
        if (reverseScrollBehavior) document.documentElement.style.scrollBehavior = reverseScrollBehavior;
        else document.documentElement.style.removeProperty("scroll-behavior");
        reverseScrollBehaviorCaptured = false;
      }
      window.dispatchEvent(new CustomEvent("work-about-handoff-complete", {
        detail: { section: "work" }
      }));
    };
    const markReversePhoneComplete = () => {
      reversePhoneComplete = true;
      finishReverseReturn();
    };
    const waitForReverseLanding = (target) => {
      cancelAnimationFrame(reverseLandingFrame);
      const startedAt = performance.now();
      const checkLanding = () => {
        if (Math.abs(window.scrollY - target) <= 3 || performance.now() - startedAt > 2000) {
          reverseLandingFrame = undefined;
          reverseScrollComplete = true;
          finishReverseReturn();
          return;
        }
        reverseLandingFrame = requestAnimationFrame(checkLanding);
      };
      checkLanding();
    };
    const holdForRail = () => {
      clearTimeout(settleTimer);
      reverseScrollComplete = false;
      reversePhoneComplete = false;
      window.dispatchEvent(new Event("work-about-handoff-complete"));
      railJumping = true;
      zone = "inactive";
      releaseAboutStage();
      navigationTween?.kill();
      moving = false;
      aboutObserver?.disable();
    };
    const settleFromRail = (event) => {
      railJumping = false;
      moving = false;
      if (event.detail?.section === "about") {
        zone = "about";
        aboutObserver?.enable();
      } else if (event.detail?.section === "contact") {
        zone = "contact";
        aboutObserver?.enable();
      }
    };
    el.addEventListener("pointermove", move);
    const armAboutAfterContact = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (zone !== "contact-settling") return;
        zone = "about";
        moving = false;
      }, 220);
    };
    const aboutObserver = Observer.create({
      target: window,
      type: "wheel,touch",
      preventDefault: true,
      tolerance: 22,
      onChangeY: (self) => {
        if (zone === "contact-settling") {
          armAboutAfterContact();
          return;
        }
        if (moving) return;
        if (zone === "contact") {
          if (self.deltaY >= 0) return;
          moving = true;
          zone = "returning-contact";
          aboutObserver.disable();
          const aboutTrigger = ScrollTrigger.getById("about-section");
          navigationTween?.kill();
          navigationTween = gsap.to(window, {
            scrollTo: aboutTrigger ? aboutTrigger.start : "#about",
            duration: .95,
            ease: "power3.inOut",
            overwrite: true,
            onComplete: () => {
              moving = false;
              zone = "contact-settling";
              showAbout();
              aboutObserver.enable();
              armAboutAfterContact();
            }
          });
          return;
        }
        if (zone !== "about") return;
        moving = true;
        aboutObserver.disable();
        const movingForward = self.deltaY > 0;
        const galleryScrub = ScrollTrigger.getById("gallery-scrub");
        const target = movingForward
          ? "#contact"
          : galleryScrub
            ? galleryScrub.start + (galleryScrub.end - galleryScrub.start) * .74
            : "#gallery";
        navigationTween?.kill();
        if (!movingForward) {
          zone = "returning-work";
          reverseScrollComplete = false;
          reversePhoneComplete = false;
          if (!reverseScrollBehaviorCaptured) {
            reverseScrollBehavior = document.documentElement.style.scrollBehavior;
            reverseScrollBehaviorCaptured = true;
          }
          // GSAP owns this scroll. Native smooth scrolling otherwise keeps
          // moving after the timeline and briefly drops the sticky Work scene.
          document.documentElement.style.scrollBehavior = "auto";
          window.dispatchEvent(new Event("work-about-handoff-start"));
          window.dispatchEvent(new Event("prepare-gallery-work-return"));
          entranceTween?.kill();
          continuousSceneWaiting = false;
          continuousArrivalPending = false;
          gsap.killTweensOf([aboutScene, heading, collageStage, ...cards]);
          gsap.set(aboutScene, {
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 30,
            pointerEvents: "none",
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
            transformOrigin: "center center"
          });
          navigationTween = gsap.timeline({
            defaults: { ease: "power3.inOut" },
            onComplete: () => waitForReverseLanding(target)
          })
            .to(aboutScene, {
              x: "-31vw",
              y: "-6vh",
              scale: .24,
              rotation: -8,
              duration: 1.05
            }, 0)
            .add(() => window.dispatchEvent(new Event("resume-gallery-work")), 1.05)
            .to(aboutScene, { opacity: 0, duration: .38, ease: "power2.in" }, 1.32)
            .to(window, { scrollTo: target, duration: 1.05 }, 1.05);
          return;
        }

        releaseAboutStage();
        navigationTween = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          onComplete: () => {
            moving = false;
            zone = "contact";
            aboutObserver.enable();
          }
        })
          .to(heading, { opacity: 0, y: -24, duration: .38 }, 0)
          .to(cards, { opacity: 0, scale: .94, stagger: .025, duration: .4 }, 0)
          .to(window, { scrollTo: target, duration: .95 }, .05);
      }
    });
    aboutObserver.disable();
    window.addEventListener("show-life-outside", showAbout);
    const finishContinuousArrival = () => {
      if (!continuousSceneWaiting) return;
      continuousSceneWaiting = false;
      moving = false;
      zone = "about";
      aboutObserver.enable();
      entranceTween?.kill();
      entranceTween = gsap.timeline()
        .to(aboutScene, {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 1.05,
          ease: "power3.inOut"
        })
        .set(aboutScene, { clearProps: "position,left,top,width,height,zIndex,pointerEvents,opacity,transform,transformOrigin" })
        .to(cards, {
          opacity: .58,
          duration: .18,
          stagger: .045,
          ease: "power1.out"
        })
        .set(cards, { clearProps: "opacity" })
        .add(() => window.dispatchEvent(new CustomEvent("work-about-handoff-complete", {
          detail: { section: "about" }
        })));
    };
    window.addEventListener("life-outside-takeover-complete", finishContinuousArrival);
    window.addEventListener("gallery-work-return-complete", markReversePhoneComplete);
    window.addEventListener("nav-rail-jump-start", holdForRail);
    window.addEventListener("nav-rail-arrive", settleFromRail);
    const enterAbout = () => {
      zone = "about";
      if (continuousArrivalPending) continuousArrivalPending = false;
      else showAbout();
      aboutObserver.enable();
    };
    const trigger = ScrollTrigger.create({
      id: "about-section",
      trigger: el,
      start: "top top+=2",
      end: "bottom top",
      onEnter: enterAbout,
      onEnterBack: () => {
        if (zone !== "returning-contact" && zone !== "contact-settling") {
          zone = "about";
          showAbout();
          aboutObserver.enable();
        }
      },
      // The forward tween crosses this boundary before its own completion callback.
      // Do not let a late ScrollTrigger update disable the observer after Contact
      // has taken ownership of it.
      onLeave: () => {
        if (zone !== "contact" && zone !== "returning-contact") aboutObserver.disable();
      },
      // Contact returns to this trigger's exact start. ScrollTrigger can report
      // that landing as onLeaveBack, so only disable when another section truly
      // owns navigation; otherwise the next About -> Work gesture gets lost.
      onLeaveBack: () => {
        if (zone !== "about" && zone !== "contact-settling" && zone !== "returning-contact") {
          aboutObserver.disable();
        }
      }
    });
    const contactZoneTrigger = ScrollTrigger.create({
      id: "contact-observer-zone",
      trigger: "#contact",
      start: "top top+=2",
      end: "bottom top",
      onEnter: () => {
        if (moving || railJumping) return;
        zone = "contact";
        aboutObserver.enable();
      },
      onEnterBack: () => {
        if (moving || railJumping) return;
        zone = "contact";
        aboutObserver.enable();
      },
      onLeave: () => aboutObserver.disable(),
      onLeaveBack: () => {
        if (zone === "contact") {
          zone = "inactive";
          aboutObserver.disable();
        }
      }
    });
    return () => {
      el.removeEventListener("pointermove", move);
      cards.forEach((card) => {
        card.removeEventListener("pointerenter", showSpotlight);
        card.removeEventListener("pointerleave", hideSpotlight);
      });
      window.removeEventListener("show-life-outside", showAbout);
      window.removeEventListener("life-outside-takeover-complete", finishContinuousArrival);
      window.removeEventListener("gallery-work-return-complete", markReversePhoneComplete);
      window.removeEventListener("nav-rail-jump-start", holdForRail);
      window.removeEventListener("nav-rail-arrive", settleFromRail);
      clearTimeout(settleTimer);
      cancelAnimationFrame(reverseLandingFrame);
      if (reverseScrollBehaviorCaptured) {
        if (reverseScrollBehavior) document.documentElement.style.scrollBehavior = reverseScrollBehavior;
        else document.documentElement.style.removeProperty("scroll-behavior");
        reverseScrollBehaviorCaptured = false;
      }
      entranceTween?.kill();
      navigationTween?.kill();
      window.dispatchEvent(new Event("work-about-handoff-complete"));
      aboutObserver.kill();
      trigger.kill();
      contactZoneTrigger.kill();
    };
  }, []);
  return (
    <section className="about dark" ref={ref} id="about">
      <div className="about-stage">
        <h2>Life outside work.</h2>
        <div className="about-spotlight" aria-hidden="true" />
        {/* TODO(content): replace gradients with final photos, film stills, playlist covers, and personal portrait. */}
        <div className="collage">{collage.map(([n, type, depth]) => <article data-content-status="placeholder" className={"collage-card card-" + type} data-depth={depth} key={n}><div className="tape" /><span>{n}</span>{type === "phone" && <img src="/media/about/hand-phone.png" alt="" />}</article>)}</div>
      </div>
    </section>
  );
}

function Contact() {
  const [record, setRecord] = useState(null), [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(.72);
  const platterRef = useRef(null);
  const platterSlotRef = useRef(null);
  const discRefs = useRef([]);
  const sleeveRefs = useRef([]);
  const loadedRecordRef = useRef(null);
  const recordSwapLocked = useRef(false);
  const tonearmRef = useRef(null);
  const audioRef = useRef(null);
  const volumeRef = useRef(.72);
  const volumeDrag = useRef({ active: false, startX: 0, startY: 0, startVolume: .72 });
  const scratchDrag = useRef({ active: false, angle: 0, pointerAngle: 0, wasPlaying: false });
  const drag = useRef({ active: false, angle: -12, startX: 0, startAngle: -12 });
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const source = record === null ? null : records[record].audio;
    audio.dataset.playback = playing ? "playing" : "paused";
    gsap.killTweensOf(audio);
    if (source && audio.getAttribute("src") !== source) {
      audio.pause();
      audio.src = source;
      audio.load();
      audio.volume = 0;
    }
    if (playing && source) {
      if (audio.ended) audio.currentTime = 0;
      audio.play().then(() => {
        if (audio.dataset.playback === "playing") {
          gsap.to(audio, { volume: volumeRef.current, duration: .9, ease: "power1.out" });
        }
      }).catch(() => {});
    } else {
      if (audio.paused) {
        audio.volume = 0;
      } else {
        gsap.to(audio, {
          volume: 0,
          duration: .7,
          ease: "power1.inOut",
          onComplete: () => {
            if (audio.dataset.playback !== "playing") audio.pause();
          }
        });
      }
    }
  }, [record, playing]);
  useEffect(() => () => {
    const audio = audioRef.current;
    if (!audio) return;
    gsap.killTweensOf(audio);
    audio.pause();
  }, []);
  const setTurntableVolume = (value) => {
    const nextVolume = gsap.utils.clamp(0, 1, Number(value));
    volumeRef.current = nextVolume;
    setVolume(nextVolume);
    const audio = audioRef.current;
    if (!audio || !playing) return;
    gsap.killTweensOf(audio);
    gsap.to(audio, { volume: nextVolume, duration: .16, ease: "power1.out" });
  };
  const changeVolume = (event) => setTurntableVolume(event.currentTarget.value);
  const moveVolume = (event) => {
    if (!volumeDrag.current.active) return;
    const horizontal = event.clientX - volumeDrag.current.startX;
    const vertical = volumeDrag.current.startY - event.clientY;
    setTurntableVolume(volumeDrag.current.startVolume + (horizontal + vertical) / 180);
  };
  const releaseVolume = (event) => {
    if (!volumeDrag.current.active) return;
    volumeDrag.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const getPointerAngle = (event, element) => {
    const rect = element.getBoundingClientRect();
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
  };
  const beginScratch = (event) => {
    if (event.button !== 0 || loadedRecordRef.current === null || recordSwapLocked.current) return;
    const disc = platterSlotRef.current?.querySelector(".contact-disc");
    if (!disc) return;
    event.preventDefault();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(disc).transform);
    const visibleAngle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    scratchDrag.current = {
      active: true,
      angle: visibleAngle,
      pointerAngle: getPointerAngle(event, event.currentTarget),
      wasPlaying: playing
    };
    disc.style.transform = `rotate(${visibleAngle}deg)`;
    event.currentTarget.classList.add("scratching");
    event.currentTarget.setPointerCapture(event.pointerId);

    const audio = audioRef.current;
    if (audio && !playing) {
      gsap.killTweensOf(audio);
      audio.volume = volumeRef.current * .72;
      audio.play().catch(() => {});
    }
  };
  const moveScratch = (event) => {
    if (!scratchDrag.current.active) return;
    const disc = platterSlotRef.current?.querySelector(".contact-disc");
    const audio = audioRef.current;
    if (!disc) return;
    event.preventDefault();
    const pointerAngle = getPointerAngle(event, event.currentTarget);
    let delta = pointerAngle - scratchDrag.current.pointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    scratchDrag.current.pointerAngle = pointerAngle;
    scratchDrag.current.angle += delta;
    disc.style.transform = `rotate(${scratchDrag.current.angle}deg)`;

    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = gsap.utils.clamp(0, Math.max(0, audio.duration - .02), audio.currentTime + delta / 200);
    }
  };
  const releaseScratch = (event) => {
    if (!scratchDrag.current.active) return;
    const disc = platterSlotRef.current?.querySelector(".contact-disc");
    const audio = audioRef.current;
    scratchDrag.current.active = false;
    if (disc) {
      disc.style.setProperty("--spin-start", `${scratchDrag.current.angle}deg`);
      disc.style.removeProperty("transform");
    }
    event.currentTarget.classList.remove("scratching");
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (audio && !scratchDrag.current.wasPlaying) {
      gsap.killTweensOf(audio);
      gsap.to(audio, {
        volume: 0,
        duration: .16,
        ease: "power1.out",
        onComplete: () => {
          if (audio.dataset.playback !== "playing") audio.pause();
        }
      });
    }
  };
  const loadRecord = (index) => {
    if (index === loadedRecordRef.current || recordSwapLocked.current) return;
    const incomingDisc = discRefs.current[index];
    const platterSlot = platterSlotRef.current;
    const previousIndex = loadedRecordRef.current;
    const outgoingDisc = previousIndex === null ? null : discRefs.current[previousIndex];
    const incomingCover = sleeveRefs.current[index]?.querySelector(".sleeve-cover");
    const outgoingCover = previousIndex === null ? null : sleeveRefs.current[previousIndex]?.querySelector(".sleeve-cover");
    if (!incomingDisc || !platterSlot) return;

    setPlaying(false);
    if (prefersReducedMotion()) {
      if (outgoingDisc) {
        sleeveRefs.current[previousIndex]?.appendChild(outgoingDisc);
        gsap.set(outgoingDisc, { zIndex: 0, clearProps: "transform" });
      }
      platterSlot.appendChild(incomingDisc);
      gsap.set(incomingDisc, { zIndex: 2, clearProps: "transform" });
      loadedRecordRef.current = index;
      setRecord(index);
      return;
    }

    recordSwapLocked.current = true;
    const movingDiscs = outgoingDisc ? [outgoingDisc, incomingDisc] : [incomingDisc];
    Flip.killFlipsOf(movingDiscs);
    gsap.killTweensOf(movingDiscs);

    if (outgoingDisc) {
      const outState = Flip.getState(outgoingDisc);
      sleeveRefs.current[previousIndex]?.appendChild(outgoingDisc);
      if (outgoingCover) gsap.set(outgoingCover, { zIndex: 11 });
      gsap.set(outgoingDisc, {
        xPercent: 110,
        rotation: 0,
        zIndex: 10
      });
      Flip.from(outState, {
        duration: 1.15,
        ease: "power1.inOut",
        scale: true,
        absolute: true,
        spin: 1,
        zIndex: 10,
        onComplete: () => {
          queueMicrotask(() => {
            gsap.fromTo(outgoingDisc, {
              x: 0,
              xPercent: 110,
              rotation: 0,
              zIndex: 10
            }, {
              x: 0,
              xPercent: 0,
              rotation: 360,
              delay: .14,
              duration: 1.3,
              ease: "sine.inOut",
              onComplete: () => {
                gsap.set(outgoingDisc, { clearProps: "transform,zIndex" });
                if (outgoingCover) gsap.set(outgoingCover, { clearProps: "zIndex" });
              }
            });
          });
        }
      });
    }

    loadedRecordRef.current = index;
    setRecord(index);
    if (incomingCover) gsap.set(incomingCover, { zIndex: 11 });
    gsap.to(incomingDisc, {
      xPercent: 110,
      rotation: 160,
      zIndex: 10,
      duration: .9,
      ease: "power2.inOut",
      onComplete: () => {
        if (incomingCover) gsap.set(incomingCover, { clearProps: "zIndex" });
        const inState = Flip.getState(incomingDisc);
        platterSlot.appendChild(incomingDisc);
        gsap.set(incomingDisc, { clearProps: "transform" });
        Flip.from(inState, {
          duration: 1.15,
          ease: "power1.inOut",
          scale: true,
          absolute: true,
          spin: -1,
          zIndex: 12,
          onComplete: () => {
            gsap.set(incomingDisc, { zIndex: 2, clearProps: "transform" });
            recordSwapLocked.current = false;
          }
        });
      }
    });
  };
  const moveTonearm = (event) => {
    if (!drag.current.active) return;
    const rect = platterRef.current.getBoundingClientRect();
    const travel = Math.max(rect.width * .42, 1);
    const delta = (drag.current.startX - event.clientX) / travel * 34;
    drag.current.angle = gsap.utils.clamp(-12, 22, drag.current.startAngle + delta);
    tonearmRef.current.style.transform = "rotate(" + drag.current.angle + "deg)";
  };
  const releaseTonearm = (event) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    event.currentTarget.classList.remove("dragging");
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const isDown = drag.current.angle > -5;
    drag.current.angle = isDown ? 22 : -12;
    setPlaying(isDown);
    if (prefersReducedMotion()) {
      tonearmRef.current.style.removeProperty("transform");
      return;
    }
    gsap.to(tonearmRef.current, {
      rotation: isDown ? 22 : -12,
      duration: .45,
      ease: "power2.out",
      onComplete: () => tonearmRef.current.style.removeProperty("transform")
    });
  };
  return (
    <section className="contact dark" id="contact">
      <header className="section-head"><span>04 / Contact</span><span>Drop a record</span></header>
      <div className="contact-copy"><p>Let’s make something worth replaying.</p><h2>Talk to me before<br />someone else hires me.</h2><div className="contact-links"><a href="mailto:hello@sriharsha.design">hello@sriharsha.design</a><a href="#">LinkedIn</a><a href="#top">Back to top ↑</a></div></div>
      <div className="turntable">
        <div className="deck">
          <audio ref={audioRef} preload="metadata" onEnded={() => setPlaying(false)} />
          <div
            className={"platter " + (playing ? "playing" : "")}
            ref={platterRef}
            onPointerDown={beginScratch}
            onPointerMove={moveScratch}
            onPointerUp={releaseScratch}
            onPointerCancel={releaseScratch}
            title="Drag the vinyl forward or backward to scratch"
          >
            <div className="platter-disc-slot" ref={platterSlotRef} />
          </div>
          <button
            ref={tonearmRef}
            className={"tonearm " + (playing ? "down" : "")}
            onPointerDown={(event) => {
              const matrix = new DOMMatrixReadOnly(getComputedStyle(event.currentTarget).transform);
              const currentAngle = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
              gsap.killTweensOf(event.currentTarget);
              drag.current.active = true;
              drag.current.angle = currentAngle;
              drag.current.startAngle = currentAngle;
              drag.current.startX = event.clientX;
              event.currentTarget.style.transform = `rotate(${currentAngle}deg)`;
              event.currentTarget.classList.add("dragging");
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={moveTonearm}
            onPointerUp={releaseTonearm}
            onPointerCancel={releaseTonearm}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setPlaying((v) => !v); }}
            aria-label={playing ? "Drag tonearm away to stop" : "Drag tonearm onto the record to play"}
          ><i /><b /></button>
          <label className="volume-control" title={`Volume ${Math.round(volume * 100)}%`}>
            <span className="volume-dial" style={{ "--volume-angle": `${-135 + volume * 270}deg` }} aria-hidden="true"><i /></span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={changeVolume}
              onPointerDown={(event) => {
                event.preventDefault();
                volumeDrag.current = { active: true, startX: event.clientX, startY: event.clientY, startVolume: volumeRef.current };
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={moveVolume}
              onPointerUp={releaseVolume}
              onPointerCancel={releaseVolume}
              aria-label="Turntable volume"
            />
            <b>VOL</b>
          </label>
          <div className="deck-brand">SH–01<br /><small>MANUAL DRIVE</small></div>
        </div>
        <div className="record-row">{records.map((r, i) => <button key={r.id} data-track-id={r.id} className={record === i ? "selected" : ""} onClick={() => loadRecord(i)} aria-label={`Load ${r.title}`}><span className="sleeve" ref={(node) => { sleeveRefs.current[i] = node; }}><span className="sleeve-cover" style={{ backgroundImage: `url("${r.cover}")` }} aria-hidden="true" /><span className={"contact-disc contact-disc-" + r.art} style={{ "--disc-art": `url("${r.cover}")` }} data-home={r.id} ref={(node) => { discRefs.current[i] = node; }} aria-hidden="true"><i /></span></span><b>{String(i + 1).padStart(2, "0")}</b><em>{r.title}</em></button>)}</div>
      </div>
    </section>
  );
}

export default function Home() {
  return <main><Hero /><Intro /><Gallery /><About /><Contact /><div className="section-disco-rays" aria-hidden="true" /><div className="section-wipe-beam" aria-hidden="true" /><div className="section-disco-ball" aria-hidden="true"><i /></div><NavRail /></main>;
}
