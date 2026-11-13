"use client";

import React, { useState } from "react";
import { PeerState } from "@/lib/space/signaling";
import { OFFICE_ZONES, SpaceZone } from "@/lib/space/officeMap";
import { IconLock, IconMicOff } from "@/components/space/SpaceIcons";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  zoneId?: string;
}

export type SidebarTab = "people" | "rooms" | "chat";

interface SpaceSidebarProps {
  localPeer: PeerState;
  remotePeers: PeerState[];
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onWarpToRoom: (zone: SpaceZone) => void;
  onWarpToPeer: (peer: PeerState) => void;
  isOpen: boolean;
  onClose: () => void;
  activeTab?: SidebarTab;
  onTabChange?: (tab: SidebarTab) => void;
  unreadChatCount?: number;
}

export function SpaceSidebar({
  localPeer,
  remotePeers,
  chatMessages,
  onSendMessage,
  onWarpToRoom,
  onWarpToPeer,
  isOpen,
  onClose,
  activeTab: controlledTab,
  onTabChange,
  unreadChatCount = 0,
}: SpaceSidebarProps) {
  const [internalTab, setInternalTab] = useState<SidebarTab>("people");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: SidebarTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [chatInput, setChatInput] = useState("");

  const allPeers = [localPeer, ...remotePeers];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
  };

  return (
    <aside
      aria-hidden={!isOpen}
      className={`fixed top-14 right-3 bottom-16 z-30 w-[calc(100vw-1.5rem)] max-w-[19rem] rounded-2xl bg-surface/92 backdrop-blur-xl border border-border/80 shadow-arcade flex flex-col transition-all duration-200 ease-out ${
        isOpen
          ? "translate-x-0 opacity-100 pointer-events-auto"
          : "translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none"
      }`}
    >
      {/* Compact Drawer Header & Tab Navigation */}
      <div className="h-11 border-b border-border/70 px-2.5 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={`px-2 py-1 text-[11px] font-display rounded-lg transition-colors ${
              activeTab === "people"
                ? "bg-surface-2 text-text font-bold border border-border/70"
                : "text-text-muted hover:text-text"
            }`}
          >
            People ({allPeers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rooms")}
            className={`px-2 py-1 text-[11px] font-display rounded-lg transition-colors ${
              activeTab === "rooms"
                ? "bg-surface-2 text-text font-bold border border-border/70"
                : "text-text-muted hover:text-text"
            }`}
          >
            Rooms
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`px-2 py-1 text-[11px] font-display rounded-lg transition-colors flex items-center gap-1 ${
              activeTab === "chat"
                ? "bg-surface-2 text-text font-bold border border-border/70"
                : "text-text-muted hover:text-text"
            }`}
          >
            <span>Chat</span>
            {unreadChatCount > 0 ? (
              <span className="px-1.5 min-w-[1rem] h-3.5 rounded-full bg-accent text-bg text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            ) : (
              chatMessages.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text hover:bg-surface-2 p-1 rounded-lg transition-colors"
          aria-label="Close panel"
          title="Close Panel (B)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* TAB 1: PEOPLE */}
        {activeTab === "people" && (
          <div className="space-y-2">
            <span className="text-[10px] font-display text-text-muted uppercase tracking-wider block px-1">
              Online Coworkers ({allPeers.length})
            </span>

            {allPeers.map((peer) => {
              const isLocal = peer.id === localPeer.id;
              const zone = OFFICE_ZONES.find((z) => z.id === peer.zoneId);

              return (
                <div
                  key={peer.id}
                  className="p-2.5 rounded-control bg-surface-2/60 border border-border/80 hover:border-border transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-display text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: peer.avatarColor }}
                    >
                      {peer.name.slice(0, 2).toUpperCase()}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-display text-text font-semibold truncate">
                          {peer.name} {isLocal && "(You)"}
                        </span>
                        {!peer.media.audio && (
                          <span className="text-red-400 inline-flex items-center" title="Muted">
                            <IconMicOff className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-text-muted truncate">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: zone?.color || "#37E6C4" }}
                        />
                        <span className="truncate">{zone?.name || "Floor"}</span>
                        {peer.status && (
                          <span className="text-accent font-medium truncate">
                            • {peer.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isLocal && (
                    <button
                      onClick={() => onWarpToPeer(peer)}
                      className="px-2 py-1 text-[10px] font-display bg-surface hover:bg-surface-2 border border-border text-accent rounded-control flex-shrink-0"
                    >
                      Walk to
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: ROOMS */}
        {activeTab === "rooms" && (
          <div className="space-y-2">
            <span className="text-[10px] font-display text-text-muted uppercase tracking-wider block px-1">
              Office Directory & Zones
            </span>

            {OFFICE_ZONES.map((zone) => {
              const peersInZone = allPeers.filter((p) => p.zoneId === zone.id);

              return (
                <div
                  key={zone.id}
                  className="p-3 rounded-control bg-surface-2/60 border border-border/80 hover:border-border transition-colors flex items-start justify-between gap-2"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span className="text-xs font-display text-text font-bold truncate">
                        {zone.name}
                      </span>
                    </div>

                    <p className="text-[11px] text-text-muted line-clamp-2">
                      {zone.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[10px]">
                      {zone.isPrivate && (
                        <span className="text-accent font-mono inline-flex items-center gap-1">
                          <IconLock className="w-3 h-3" />
                          <span>Soundproof</span>
                        </span>
                      )}
                      <span className="text-text-muted font-mono">
                        {peersInZone.length} {peersInZone.length === 1 ? "person" : "people"} here
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onWarpToRoom(zone)}
                    className="px-2.5 py-1 text-xs font-display bg-accent text-bg font-bold rounded-control hover:brightness-110 flex-shrink-0 mt-1"
                  >
                    Enter
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: CHAT */}
        {activeTab === "chat" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-text-muted text-center pt-8">
                  No messages yet. Say hello to your coworkers!
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 rounded-control bg-surface-2 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span className="font-display font-semibold text-accent">
                        {msg.sender}
                      </span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-text font-sans break-words">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="pt-2 border-t border-border flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={200}
                className="flex-1 px-2.5 py-1.5 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-accent text-bg font-display font-bold rounded-control hover:brightness-110"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
