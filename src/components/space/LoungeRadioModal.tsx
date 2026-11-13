"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

interface LoungeRadioModalProps {
  open: boolean;
  onClose: () => void;
}

const RADIO_STATIONS = [
  {
    id: "lofi-coding",
    name: "Midnight Coding Beats",
    tagline: "Warm analog vinyl & gentle hip-hop drums for deep flow.",
    icon: "🎧",
    bpm: 72,
    baseFreq: 220, // A3
    scale: [220, 246.94, 261.63, 293.66, 329.63, 392.0], // Minor pentatonic
  },
  {
    id: "rainy-cafe",
    name: "Rainy Cafe Ambiance",
    tagline: "Calm piano chords & soothing rain textures.",
    icon: "☕",
    bpm: 64,
    baseFreq: 261.63, // C4
    scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], // Major pentatonic
  },
  {
    id: "deep-synth",
    name: "Deep Space Ambient",
    tagline: "Ethereal pads and dreamy sub-frequencies.",
    icon: "✨",
    bpm: 50,
    baseFreq: 174.61, // F3
    scale: [174.61, 196.0, 220.0, 261.63, 329.63, 349.23], // Lydian float
  },
];

export function LoungeRadioModal({ open, onClose }: LoungeRadioModalProps) {
  const [selectedStation, setSelectedStation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const timerRef = useRef<any>(null);

  // Stop synthesizer on modal close
  useEffect(() => {
    if (!open && isPlaying) {
      stopSynthesizer();
      setIsPlaying(false);
    }
  }, [open, isPlaying]);

  const startSynthesizer = () => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    const station = RADIO_STATIONS[selectedStation] || RADIO_STATIONS[0]!;
    const beatIntervalMs = (60 / station.bpm) * 1000;

    let step = 0;
    timerRef.current = setInterval(() => {
      if (!audioCtxRef.current || audioCtxRef.current.state === "suspended") return;
      playNote(station.scale[step % station.scale.length]!, station.id);
      step++;
    }, beatIntervalMs);

    setIsPlaying(true);
  };

  const stopSynthesizer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
  };

  const playNote = (freq: number, stationId: string) => {
    const ctx = audioCtxRef.current;
    const master = gainNodeRef.current;
    if (!ctx || !master) return;

    try {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = stationId === "deep-synth" ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      noteGain.gain.setValueAtTime(0, ctx.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

      osc.connect(noteGain);
      noteGain.connect(master);

      osc.start();
      osc.stop(ctx.currentTime + 1.8);
    } catch {
      // ignore
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopSynthesizer();
    } else {
      startSynthesizer();
    }
  };

  const handleStationChange = (index: number) => {
    setSelectedStation(index);
    if (isPlaying) {
      stopSynthesizer();
      setTimeout(startSynthesizer, 100);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(v * 0.15, audioCtxRef.current.currentTime, 0.05);
    }
  };

  const activeStation = RADIO_STATIONS[selectedStation] || RADIO_STATIONS[0]!;

  return (
    <ArcadeDialog
      open={open}
      onClose={() => {
        stopSynthesizer();
        onClose();
      }}
      title="📻 Breakroom Lo-Fi Radio"
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {/* Retro Wooden Radio Display */}
        <div className="p-5 rounded-container bg-surface-2 border-2 border-border shadow-arcade text-center space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-mono flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-ping" : "bg-red-500"}`} />
              {isPlaying ? "ON AIR • FM 98.4" : "STANDBY"}
            </span>
            <span className="font-mono text-accent">{activeStation.bpm} BPM</span>
          </div>

          <div className="py-2">
            <span className="text-4xl block mb-1">{activeStation.icon}</span>
            <h3 className="font-display text-base font-bold text-text">
              {activeStation.name}
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
              {activeStation.tagline}
            </p>
          </div>

          {/* Equalizer animation bar */}
          <div className="flex items-center justify-center gap-1 h-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <span
                key={bar}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isPlaying ? "bg-accent" : "bg-surface"
                }`}
                style={{
                  height: isPlaying ? `${Math.max(4, (bar * 7) % 24)}px` : "4px",
                }}
              />
            ))}
          </div>

          {/* Play / Stop Button */}
          <button
            onClick={handleTogglePlay}
            className={`w-full py-2.5 rounded-control font-display font-bold text-xs shadow-arcade transition-all ${
              isPlaying
                ? "bg-red-500 text-white hover:brightness-110"
                : "bg-accent text-bg hover:brightness-110"
            }`}
          >
            {isPlaying ? "PAUSE LO-FI RADIO" : "PLAY FOCUS BEATS"}
          </button>
        </div>

        {/* Station Selectors */}
        <div className="space-y-1.5">
          <label className="block text-xs font-display text-text">
            Select Focus Station:
          </label>
          <div className="space-y-1">
            {RADIO_STATIONS.map((station, i) => (
              <button
                key={station.id}
                onClick={() => handleStationChange(i)}
                className={`w-full p-2 rounded-control text-xs flex items-center justify-between border transition-colors ${
                  selectedStation === i
                    ? "bg-accent/15 border-accent text-accent font-semibold"
                    : "bg-surface border-border text-text hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{station.icon}</span>
                  <span>{station.name}</span>
                </div>
                <span className="font-mono text-[10px] text-text-muted">
                  {station.bpm} BPM
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Volume Slider */}
        <div className="space-y-1 pt-1 border-t border-border">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
        </div>
      </div>
    </ArcadeDialog>
  );
}
