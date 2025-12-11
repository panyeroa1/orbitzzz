"use client";

import { useState } from "react";
import { DollarSign, Heart, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface DonationSidebarProps {
  onActiveChange?: (isActive: boolean) => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export function DonationSidebar({ onActiveChange }: DonationSidebarProps) {
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handlePresetClick = (value: number) => {
    setAmount(value.toString());
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      setAmount(value);
    }
  };

  const handleDonate = async () => {
    const donationAmount = parseInt(amount);

    if (!donationAmount || donationAmount < 1) {
      setStatus("error");
      setMessage("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    setStatus("idle");
    setMessage("");

    try {
      // Call Stripe API endpoint
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: donationAmount,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.error) {
        setStatus("error");
        setMessage(data.error);
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Heart className="h-6 w-6 text-red-400" fill="currentColor" />
          <h2 className="text-xl font-bold text-white">Support Our Church</h2>
        </div>
        <p className="text-sm text-white/60">
          Your donation helps us continue our mission and serve our community
        </p>
      </div>

      {/* Preset Amounts */}
      <div>
        <label className="mb-3 block text-sm text-white/60">
          Select Amount
        </label>
        <div className="grid grid-cols-3 gap-3">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              className={cn(
                "rounded-apple border px-4 py-3 font-semibold transition-all",
                amount === preset.toString()
                  ? "border-[#00e0ff] bg-gradient-to-r from-[#00e0ff] to-[#006dff] text-white"
                  : "border-white/10 bg-dark-3/80 text-white/70 hover:bg-dark-3 hover:text-white"
              )}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <label className="mb-2 block text-sm text-white/60">
          Custom Amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={customAmount}
            onChange={handleCustomAmountChange}
            placeholder="Enter amount"
            className="w-full rounded-apple border border-white/10 bg-dark-3/80 py-3 pl-12 pr-4 text-white transition-colors placeholder:text-white/30 focus:border-[#00e0ff] focus:outline-none"
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "rounded-apple p-3 text-sm",
            status === "success" &&
              "border border-green-500/30 bg-green-500/20 text-green-400",
            status === "error" &&
              "border border-red-500/30 bg-red-500/20 text-red-400"
          )}
        >
          {message}
        </div>
      )}

      {/* Donate Button */}
      <button
        onClick={handleDonate}
        disabled={isProcessing || !amount}
        className={cn(
          "w-full rounded-apple px-6 py-4 text-lg font-semibold transition-all",
          "flex items-center justify-center gap-3 shadow-lg",
          isProcessing || !amount
            ? "cursor-not-allowed bg-dark-3/80 text-white/40"
            : "bg-gradient-to-r from-[#00e0ff] to-[#006dff] text-white shadow-blue-500/20 hover:opacity-90"
        )}
      >
        <CreditCard size={20} />
        {isProcessing
          ? "Processing..."
          : `Donate ${amount ? `$${amount}` : ""}`}
      </button>

      {/* Secure Payment Badge */}
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-white/40">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z"
              clipRule="evenodd"
            />
          </svg>
          <span>Secure payment powered by Stripe</span>
        </div>
        <p className="text-xs text-white/30">
          100% of your donation goes to the church
        </p>
      </div>
    </div>
  );
}
