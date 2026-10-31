// ==============================================================================
// QUICKCHEX HRMS WEB FRONTEND - CHARACTER3DSCENE.JSX
// Path: Frontend/hrms-frontend/src/pages/EmployeePortal/components/Character3DScene.jsx
// Purpose: Web portal page component managing 'Character3DScene' views, user interactions, and state.
// UI Components:
//   • <Character3DScene />
// Key Functions & Handlers:
//   • handleMouseMove()
//   • handleMouseLeave()
// ==============================================================================

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import punchInHero from '../../../assets/punch_in_hero_3d.jpg';
import punchOutHero from '../../../assets/punch_out_hero_3d.jpg';

/**
 * Character3DScene
 * Premium Live Animated 3D Character Scene for HRMS Attendance.
 *
 * Features:
 * - High-fidelity Pixar-grade 3D character (Aaquib Khan avatar).
 * - Continuous live organic animation: breathing, head sway, 3D parallax tilt.
 * - Live gesture animation:
 *     • Punch In: dynamic entrance with confident thumbs-up spring bounce & celebration.
 *     • Punch Out: continuous natural waving hand gesture saying goodbye.
 * - Live 3D WebGL particle engine (Three.js):
 *     • Floating celebration confetti tumbling in 3D space.
 *     • Luminous glowing depth orbs drifting with depth-of-field.
 *     • Shimmering ambient light rays.
 * - Exactly ONE 3D glowing emerald checkmark badge with expanding ripple rings.
 * - Interactive 3D mouse parallax tracking.
 */
export default function Character3DScene({ type = 'punch-in' }) {
  const containerRef = useRef(null);
  const webglRef = useRef(null);
  const isPunchIn = type === 'punch-in';

  // 3D Parallax tilt state
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Sequenced animation stages:
  // 1. enter (0ms): spring entrance
  // 2. settle (400ms): moves into position
  // 3. action (850ms): thumbs up gesture (punch-in) or turn/wave (punch-out)
  // 4. indicator (1200ms): emerald badge expands with ripples
  // 5. celebration (1350ms): celebration particles burst
  // 6. living (1700ms): continuous idle & parallax
  const [animStage, setAnimStage] = useState('enter');

  useEffect(() => {
    setAnimStage('enter');
    const t1 = setTimeout(() => setAnimStage('settle'), 400);
    const t2 = setTimeout(() => setAnimStage('action'), 850);
    const t3 = setTimeout(() => setAnimStage('indicator'), 1200);
    const t4 = setTimeout(() => setAnimStage('celebration'), 1350);
    const t5 = setTimeout(() => setAnimStage('living'), 1700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [type]);

  // WebGL 3D Particle & Atmospheric Lighting Engine
  useEffect(() => {
    const container = webglRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── 1. 3D Floating Celebration Confetti ──
    const confettiGroup = new THREE.Group();
    scene.add(confettiGroup);

    const confettiCount = 28;
    const confettiPieces = [];
    const colors = isPunchIn
      ? [0x10b981, 0x6d44f5, 0x8b5cf6, 0xf59e0b, 0x38bdf8, 0xec4899]
      : [0xf59e0b, 0xf97316, 0x6d44f5, 0x8b5cf6, 0x10b981, 0xec4899];

    for (let i = 0; i < confettiCount; i++) {
      const w = 0.08 + Math.random() * 0.08;
      const h = 0.12 + Math.random() * 0.12;
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75 + Math.random() * 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const x = (Math.random() - 0.5) * 6;
      const y = (Math.random() - 0.5) * 4;
      const z = (Math.random() - 0.5) * 3;
      mesh.position.set(x, y, z);

      confettiGroup.add(mesh);
      confettiPieces.push({
        mesh,
        baseX: x,
        baseY: y,
        speedY: 0.3 + Math.random() * 0.5,
        swaySpeed: 1.2 + Math.random() * 1.5,
        rotSpeedX: (Math.random() - 0.5) * 3,
        rotSpeedY: (Math.random() - 0.5) * 4,
        rotSpeedZ: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ── 2. Glowing Soft Light Orbs (Depth) ──
    const orbGroup = new THREE.Group();
    scene.add(orbGroup);
    const orbData = [];
    const orbColors = isPunchIn
      ? [0x10b981, 0xa78bfa, 0x67e8f9]
      : [0xfbbf24, 0xf472b6, 0xa78bfa];

    for (let i = 0; i < 12; i++) {
      const r = 0.06 + Math.random() * 0.12;
      const geo = new THREE.SphereGeometry(r, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: orbColors[i % orbColors.length],
        transparent: true,
        opacity: 0.25 + Math.random() * 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const x = (Math.random() - 0.5) * 5.5;
      const y = (Math.random() - 0.5) * 3.5;
      const z = -1.5 + Math.random() * 2;
      mesh.position.set(x, y, z);
      orbGroup.add(mesh);
      orbData.push({
        mesh,
        baseY: y,
        speed: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ── 3. Animation Loop ──
    let reqId;
    let clock = new THREE.Clock();

    function animate() {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Confetti physics: falling, tumbling, fluttering
      confettiPieces.forEach((c) => {
        c.mesh.rotation.x += c.rotSpeedX * 0.012;
        c.mesh.rotation.y += c.rotSpeedY * 0.015;
        c.mesh.rotation.z += c.rotSpeedZ * 0.01;

        c.mesh.position.y = c.baseY - ((elapsed * c.speedY) % 4.5) + 2.2;
        c.mesh.position.x = c.baseX + Math.sin(elapsed * c.swaySpeed + c.phase) * 0.2;
      });

      // Floating luminous orbs
      orbData.forEach((o) => {
        o.mesh.position.y = o.baseY + Math.sin(elapsed * o.speed + o.phase) * 0.22;
      });

      // Subtle scene camera drift
      camera.position.x = Math.sin(elapsed * 0.5) * 0.08;
      camera.position.y = Math.cos(elapsed * 0.6) * 0.06;

      renderer.render(scene, camera);
    }

    animate();

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width: w, height: h } = e.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(reqId);
      ro.disconnect();
      renderer.domElement?.parentNode?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [isPunchIn]);

  // Handle interactive 3D parallax on mouse/pointer move
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 8, y: -y * 6 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={`l3d-scene-root ${isPunchIn ? 'l3d-punch-in' : 'l3d-punch-out'} l3d-stage-${animStage}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="3D Animated Attendance Success Character"
    >
      {/* ── 1. BACKGROUND 3D ATMOSPHERIC GRADIENT & GLOW ── */}
      <div className="l3d-ambient-backdrop">
        <div className="l3d-sunbeam-glow l3d-sunbeam-1" />
        <div className="l3d-sunbeam-glow l3d-sunbeam-2" />
      </div>

      {/* ── 2. THREE.JS 3D PARTICLE / CONFETTI OVERLAY ── */}
      <div ref={webglRef} className="l3d-webgl-canvas" />

      {/* ── 3. LIVE 3D ANIMATED HERO CHARACTER ── */}
      <div
        className="l3d-hero-stage"
        style={{
          transform: `perspective(900px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
        }}
      >
        <div className={`l3d-char-anim-box ${isPunchIn ? 'l3d-anim-thumbs-up' : 'l3d-anim-waving'}`}>
          <img
            src={isPunchIn ? punchInHero : punchOutHero}
            alt={isPunchIn ? '3D Character thumbs up' : '3D Character waving goodbye'}
            className="l3d-char-img"
          />

          {/* Dynamic Light Sheen across character */}
          <div className="l3d-char-shimmer" />

          {/* Living breathing shadow below character */}
          <div className="l3d-char-shadow" />
        </div>

        {/* ── Dynamic 3D Action Gesture Badges ── */}
        {isPunchIn ? (
          <div
            className={`l3d-gesture-anchor l3d-gesture-thumbs ${
              animStage === 'action' || animStage === 'indicator' || animStage === 'celebration' || animStage === 'living'
                ? 'is-active'
                : ''
            }`}
          >
            <div className="l3d-gesture-disc">
              <span className="l3d-gesture-emoji" role="img" aria-label="thumbs up">👍</span>
              <div className="l3d-gesture-sheen" />
            </div>
          </div>
        ) : (
          <div
            className={`l3d-gesture-anchor l3d-gesture-wave ${
              animStage === 'action' || animStage === 'indicator' || animStage === 'celebration' || animStage === 'living'
                ? 'is-active'
                : ''
            }`}
          >
            <div className="l3d-gesture-disc">
              <span className="l3d-gesture-emoji l3d-waving-hand" role="img" aria-label="waving goodbye">👋</span>
              <div className="l3d-gesture-sheen" />
            </div>
          </div>
        )}
      </div>

      {/* ── 4. 3D GLOWING EMERALD CHECKMARK BADGE ── */}
      <div
        className={`l3d-badge-anchor ${
          animStage === 'indicator' || animStage === 'celebration' || animStage === 'living' ? 'is-visible' : ''
        }`}
      >
        <div className="l3d-emerald-badge">
          {/* Pulsing Concentric Ripple Rings */}
          <div className="l3d-ripple-ring l3d-ripple-1" />
          <div className="l3d-ripple-ring l3d-ripple-2" />

          {/* Main 3D Glossy Emerald Badge Disc */}
          <div className="l3d-badge-disc">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="l3d-badge-check-icon"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {/* Specular gloss highlight */}
            <div className="l3d-badge-gloss" />
          </div>
        </div>
      </div>

      {/* ── 5. BOTTOM SMOOTH FADE ── */}
      <div className="l3d-bottom-fade" />
    </div>
  );
}
