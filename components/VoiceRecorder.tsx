"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Languages,
  Send,
  Zap,
  Radio,
  ArrowRight,
} from "lucide-react";

interface VoiceRecorderProps {
  onTranscriptComplete?: (transcript: string) => void;
  onOrderParsed?: (orderData: any) => void;
  shopSlug?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  compact?: boolean;
  floating?: boolean;
  className?: string;
}

// Quick spoken samples for easy testing
const SAMPLE_VOICE_PHRASES = [
  "Bhaiya 2 kilo atta, ek Amul butter aur adha kilo cheeni, tel bhi chahiye, kal subah tak bhej dena",
  "1 litre doodh, 500g toor dal aur 1 packet Madhur sugar",
  "2 packets of milk, one loaf of bread and 1kg basmati rice",
  "Ek darjan kela, 1kg aalu aur adha kilo pyaaz",
];

// Quick live correlations for visual wow factor
const LIVE_CORRELATION_HINTS: Record<string, string> = {
  cheeni: "Sugar",
  chini: "Sugar",
  shakkar: "Sugar",
  atta: "Wheat Flour",
  aata: "Atta",
  doodh: "Milk",
  dudh: "Milk",
  makhan: "Butter",
  makkhan: "Butter",
  tel: "Cooking Oil",
  sarson: "Mustard Oil",
  chawal: "Rice",
  namak: "Salt",
  chai: "Tea",
  haldi: "Turmeric",
  mirch: "Chilli",
  dhaniya: "Coriander",
  toor: "Toor Dal",
  anda: "Eggs",
  ande: "Eggs",
};

export function VoiceRecorder({
  onTranscriptComplete,
  onOrderParsed,
  shopSlug = "prasad-kirana",
  customerName = "Guest Customer",
  customerPhone,
  deliveryAddress,
  compact = false,
  floating = false,
  className = "",
}: VoiceRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [language, setLanguage] = useState<"hi-IN" | "en-IN" | "en-US">("hi-IN");
  const [isSupported, setIsSupported] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [detectedCorrelations, setDetectedCorrelations] = useState<
    Array<{ spoken: string; english: string }>
  >([]);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play subtle futuristic chime
  const playAudioCue = (type: "start" | "stop" | "success") => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "start") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "stop") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        // Success chord
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio cue is an enhancement; silent fallback
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = language;

      recognizer.onstart = () => {
        setIsListening(true);
        playAudioCue("start");
      };

      recognizer.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript + " ";
          } else {
            interimStr += res[0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => {
            const updated = (prev + " " + finalStr).replace(/\s+/g, " ").trim();
            updateCorrelations(updated);
            return updated;
          });
        }
        setInterimTranscript(interimStr);
      };

      recognizer.onerror = (event: any) => {
        console.warn("Speech recognition event:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setIsListening(false);
        }
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [language]);

  // Update live English word correlations from text
  const updateCorrelations = (text: string) => {
    const words = text.toLowerCase().split(/\s+/);
    const found: Array<{ spoken: string; english: string }> = [];
    const seen = new Set<string>();

    for (const w of words) {
      const cleanWord = w.replace(/[^\w]/g, "");
      if (LIVE_CORRELATION_HINTS[cleanWord] && !seen.has(cleanWord)) {
        seen.add(cleanWord);
        found.push({
          spoken: cleanWord,
          english: LIVE_CORRELATION_HINTS[cleanWord],
        });
      }
    }
    setDetectedCorrelations(found);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(
        "Web Speech API is not supported in this browser. You can type or use the sample audio chips below!"
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      playAudioCue("stop");
      if (onTranscriptComplete && transcript) {
        onTranscriptComplete(transcript);
      }
    } else {
      try {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition start failed:", err);
      }
    }
  };

  const handleClear = () => {
    setTranscript("");
    setInterimTranscript("");
    setDetectedCorrelations([]);
    setOrderResult(null);
  };

  const handleUseSample = (phrase: string) => {
    setTranscript(phrase);
    setInterimTranscript("");
    updateCorrelations(phrase);
    if (onTranscriptComplete) {
      onTranscriptComplete(phrase);
    }
  };

  // Submit order via Voice-to-Text LLM API to Shopkeeper
  const handleSubmitVoiceOrder = async () => {
    const textToSend = transcript.trim();
    if (!textToSend) return;

    setIsSubmitting(true);
    setOrderResult(null);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          shopSlug,
          customerName,
          customerPhone,
          deliveryAddress,
          forwardToShopkeeper: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process voice order");
      }

      playAudioCue("success");
      setOrderResult(data);
      if (onOrderParsed) {
        onOrderParsed(data);
      }
    } catch (err: any) {
      alert("Voice order submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Floating mic dock renderer
  if (floating) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {!isFloatingOpen ? (
          <button
            onClick={() => setIsFloatingOpen(true)}
            className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 text-white shadow-2xl hover:shadow-orange-500/40 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-xl border border-white/20"
            title="Open Voice Order Assistant"
          >
            <div className="relative">
              <Mic className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              </span>
            </div>
            <span className="text-sm font-bold tracking-wide">
              Voice Order / आवाज़ से ऑर्डर
            </span>
          </button>
        ) : (
          <div className="w-[380px] sm:w-[440px] rounded-2xl bg-white/95 backdrop-blur-2xl border border-orange-200/80 shadow-[0_25px_60px_-15px_rgba(234,88,12,0.3)] p-5 animate-in fade-in slide-in-from-bottom-5 duration-300 text-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-orange-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-orange-950">
                    Voice Order Assistant
                  </h3>
                  <span className="text-[10px] text-orange-700/80">
                    Hinglish ➔ English AI Correlation
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsFloatingOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs px-2 py-1 rounded hover:bg-zinc-100"
              >
                ✕ Close
              </button>
            </div>

            <VoiceRecorderContent
              isListening={isListening}
              toggleListening={toggleListening}
              transcript={transcript}
              interimTranscript={interimTranscript}
              setTranscript={setTranscript}
              language={language}
              setLanguage={setLanguage}
              isSupported={isSupported}
              isSubmitting={isSubmitting}
              detectedCorrelations={detectedCorrelations}
              handleClear={handleClear}
              handleUseSample={handleUseSample}
              handleSubmitVoiceOrder={handleSubmitVoiceOrder}
              orderResult={orderResult}
              compact={true}
            />
          </div>
        )}
      </div>
    );
  }

  // Standard inline component
  return (
    <div
      className={`rounded-2xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 via-white to-amber-50/30 p-6 shadow-sm backdrop-blur-md ${className}`}
    >
      <VoiceRecorderContent
        isListening={isListening}
        toggleListening={toggleListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        setTranscript={setTranscript}
        language={language}
        setLanguage={setLanguage}
        isSupported={isSupported}
        isSubmitting={isSubmitting}
        detectedCorrelations={detectedCorrelations}
        handleClear={handleClear}
        handleUseSample={handleUseSample}
        handleSubmitVoiceOrder={handleSubmitVoiceOrder}
        orderResult={orderResult}
        compact={compact}
      />
    </div>
  );
}

interface VoiceRecorderContentProps {
  isListening: boolean;
  toggleListening: () => void;
  transcript: string;
  interimTranscript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  language: "hi-IN" | "en-IN" | "en-US";
  setLanguage: (lang: "hi-IN" | "en-IN" | "en-US") => void;
  isSupported: boolean;
  isSubmitting: boolean;
  detectedCorrelations: Array<{ spoken: string; english: string }>;
  handleClear: () => void;
  handleUseSample: (phrase: string) => void;
  handleSubmitVoiceOrder: () => void;
  orderResult: any;
  compact?: boolean;
}

// Sub-component for recorder UI controls & sound waves
function VoiceRecorderContent({
  isListening,
  toggleListening,
  transcript,
  interimTranscript,
  setTranscript,
  language,
  setLanguage,
  isSupported,
  isSubmitting,
  detectedCorrelations,
  handleClear,
  handleUseSample,
  handleSubmitVoiceOrder,
  orderResult,
  compact = false,
}: VoiceRecorderContentProps) {
  return (
    <div className="space-y-4">
      {/* Header & Language selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span
              className={`flex h-3 w-3 rounded-full ${
                isListening ? "bg-rose-500 animate-ping" : "bg-emerald-500"
              }`}
            />
          </div>
          <span className="text-xs font-semibold text-zinc-700">
            {isListening
              ? "Listening to voice (bolte rahiye)..."
              : "Microphone Ready (आवाज़ से ऑर्डर दें)"}
          </span>
        </div>

        {/* Language selector toggle */}
        <div className="flex items-center gap-1 bg-white/80 p-1 rounded-lg border border-orange-200 text-[11px] font-medium text-zinc-600 shadow-xs">
          <Languages className="w-3.5 h-3.5 text-orange-600 ml-1" />
          <button
            type="button"
            onClick={() => setLanguage("hi-IN")}
            className={`px-2 py-0.5 rounded transition ${
              language === "hi-IN"
                ? "bg-orange-600 text-white font-bold"
                : "hover:bg-orange-50 text-zinc-600"
            }`}
          >
            🇮🇳 Hinglish
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en-IN")}
            className={`px-2 py-0.5 rounded transition ${
              language === "en-IN"
                ? "bg-orange-600 text-white font-bold"
                : "hover:bg-orange-50 text-zinc-600"
            }`}
          >
            🇮🇳 En-IN
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en-US")}
            className={`px-2 py-0.5 rounded transition ${
              language === "en-US"
                ? "bg-orange-600 text-white font-bold"
                : "hover:bg-orange-50 text-zinc-600"
            }`}
          >
            🌐 En-US
          </button>
        </div>
      </div>

      {/* Main Microphone Interaction Zone */}
      <div className="relative flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-orange-300 bg-gradient-to-b from-orange-100/30 to-white/70 overflow-hidden">
        {/* Animated equalizer waves when recording */}
        {isListening && (
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20 pointer-events-none">
            {[40, 70, 90, 60, 100, 75, 45, 85, 95, 60, 80, 50, 90, 65].map(
              (h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-orange-600 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDuration: `${0.3 + (i % 5) * 0.15}s`,
                  }}
                />
              )
            )}
          </div>
        )}

        {/* Pulsing Mic Button */}
        <div className="relative mb-3">
          {isListening && (
            <div className="absolute -inset-3 rounded-full bg-orange-500/20 animate-ping" />
          )}
          <button
            type="button"
            onClick={toggleListening}
            className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl ${
              isListening
                ? "bg-gradient-to-br from-rose-500 to-red-600 text-white scale-110 shadow-red-500/40 ring-4 ring-rose-200"
                : "bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white hover:scale-105 shadow-orange-500/30 hover:shadow-orange-500/50"
            }`}
          >
            {isListening ? (
              <MicOff className="w-7 h-7 animate-bounce" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </button>
        </div>

        <p className="text-xs font-semibold text-zinc-700 text-center">
          {isListening
            ? "Tap again to finish speaking"
            : "Tap microphone & speak naturally in Hinglish or English"}
        </p>
        <span className="text-[11px] text-zinc-400 text-center mt-0.5">
          AI dynamically matches Hindi terms to shop inventory (no aliases needed)
        </span>
      </div>

      {/* Dynamic English Word Correlation Chips */}
      {detectedCorrelations.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>AI English Word Correlations (No Aliases Needed):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {detectedCorrelations.map((cor, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-zinc-800 border border-amber-300 shadow-xs"
              >
                <span className="text-orange-700 font-semibold">{cor.spoken}</span>
                <ArrowRight className="w-3 h-3 text-zinc-400" />
                <span className="text-emerald-700 font-bold">{cor.english}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live Transcript Display Box */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-600">
          <span>Live Speech Transcript:</span>
          {transcript && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="relative min-h-[72px] p-3 rounded-xl border border-zinc-200 bg-white/90 font-sans text-xs sm:text-sm text-zinc-800 leading-relaxed shadow-inner">
          {transcript || interimTranscript ? (
            <p>
              <span>{transcript}</span>
              {interimTranscript && (
                <span className="text-zinc-400 italic"> {interimTranscript}</span>
              )}
            </p>
          ) : (
            <p className="text-zinc-400 italic">
              Your spoken words will appear here in real-time... (jaise: &ldquo;2 kilo atta, adha kilo cheeni aur tel...&rdquo;)
            </p>
          )}
        </div>
      </div>

      {/* Quick Audio Test Samples */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
          Or try a 1-click test voice phrase:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_VOICE_PHRASES.slice(0, compact ? 2 : 4).map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleUseSample(sample)}
              className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-white hover:bg-orange-50 border border-zinc-200 hover:border-orange-300 text-zinc-700 transition"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Submit Voice Order to Shopkeeper Button */}
      <div>
        <button
          type="button"
          onClick={handleSubmitVoiceOrder}
          disabled={isSubmitting || (!transcript.trim() && !interimTranscript.trim())}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/25 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Radio className="w-4 h-4 animate-spin" />
              <span>Transmitting to Shopkeeper Counter...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Parse & Send Voice Order to Shopkeeper</span>
            </>
          )}
        </button>
      </div>

      {/* Real-time Order Receipt Feedback Banner */}
      {orderResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shopkeeper Counter Received Order!</span>
            </div>
            {orderResult.shopkeeperReceipt?.token && (
              <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                {orderResult.shopkeeperReceipt.token}
              </span>
            )}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="font-semibold text-emerald-900">
              Order #{orderResult.orderNumber} • Total: {orderResult.formattedTotal}
            </div>
            <div className="text-emerald-800">
              Items extracted ({orderResult.items?.length || 0}):
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-emerald-900">
              {orderResult.items?.map((it: any, i: number) => (
                <li key={i}>
                  <span className="font-bold">
                    {it.selectedProduct?.name || it.englishCorrelation || it.spokenTerm}
                  </span>{" "}
                  — {it.quantity || "1"} {it.unit || ""} ({it.formattedLineTotal})
                  {it.correlationExplanation && (
                    <span className="block text-[10px] text-emerald-700 italic">
                      ↳ {it.correlationExplanation}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
