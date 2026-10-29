"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { defaultFirebaseWishesAdapter } from "@/features/wishes/firebase-adapter";
import type {
  Wish,
  WishesGateway,
  WishesStatus,
  WriteAttendance,
  WishesSnapshot,
} from "@/features/wishes";
import { ClassicRoseThemeConfig as ThemeConfig } from "@/lib/theme-config/classic-rose";
import SectionDivider from "./SectionDivider";

export interface WishesSectionProps {
  invitationSlug: string;
  theme: ThemeConfig;
  gateway?: WishesGateway;
}

interface FieldErrors {
  name?: string;
  message?: string;
  attendance?: string;
  submit?: string;
}

const WishesSection: React.FC<WishesSectionProps> = ({
  invitationSlug,
  gateway,
}) => {
  const activeGateway = gateway ?? defaultFirebaseWishesAdapter;

  const [wishes, setWishes] = useState<Wish[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [status, setStatus] = useState<WishesStatus>("loading");
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState<WriteAttendance | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const [prevSlug, setPrevSlug] = useState(invitationSlug);

  if (prevSlug !== invitationSlug) {
    setPrevSlug(invitationSlug);
    setStatus("loading");
    setSubscriptionError(null);
  }

  // Subscribe to real-time wishes with generation tracking & stale-callback protection
  useEffect(() => {
    if (!invitationSlug) return;

    let isCleanedUp = false;
    const currentGeneration = generation;

    const unsubscribe = activeGateway.subscribe(
      invitationSlug,
      (snapshot: WishesSnapshot) => {
        if (isCleanedUp || currentGeneration !== generation) return;
        setWishes(snapshot.wishes);
        setSkippedCount(snapshot.skippedCount);
        setStatus("ready");
        setSubscriptionError(null);
      },
      () => {
        if (isCleanedUp || currentGeneration !== generation) return;
        setStatus("error");
        setSubscriptionError("Gagal memuat ucapan. Silakan coba lagi.");
      }
    );

    return () => {
      isCleanedUp = true;
      unsubscribe();
    };
  }, [invitationSlug, generation, activeGateway]);

  const handleRetry = useCallback(() => {
    setStatus("loading");
    setSubscriptionError(null);
    setGeneration((prev) => prev + 1);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }
    if (successMessage) setSuccessMessage(null);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (fieldErrors.message) {
      setFieldErrors((prev) => ({ ...prev, message: undefined }));
    }
    if (successMessage) setSuccessMessage(null);
  };

  const handleAttendanceChange = (val: WriteAttendance) => {
    setAttendance(val);
    if (fieldErrors.attendance) {
      setFieldErrors((prev) => ({ ...prev, attendance: undefined }));
    }
    if (successMessage) setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return; // Immediate lock & double submit prevention

    if (successMessage) setSuccessMessage(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    const newErrors: FieldErrors = {};

    if (!trimmedName && !trimmedMessage) {
      newErrors.name = "Nama dan ucapan tidak boleh kosong.";
      newErrors.message = "Nama dan ucapan tidak boleh kosong.";
    } else {
      if (!trimmedName) {
        newErrors.name = "Nama tidak boleh kosong.";
      }
      if (!trimmedMessage) {
        newErrors.message = "Ucapan tidak boleh kosong.";
      }
    }

    if (!attendance) {
      newErrors.attendance = "Mohon pilih konfirmasi kehadiran Anda.";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      await activeGateway.submitWish(invitationSlug, {
        name: trimmedName,
        message: trimmedMessage,
        attendance: attendance!,
      });
      // Reset form on success
      setName("");
      setMessage("");
      setAttendance(null);
      setFieldErrors({});
      setSuccessMessage("Ucapan berhasil dikirim.");
    } catch {
      // Preserve form values on error
      setFieldErrors({ submit: "Gagal mengirim ucapan. Coba lagi." });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative">
      <div
        className="relative z-20 container mx-auto px-4 sm:px-8 max-w-xl flex flex-col items-center gap-8 text-center py-20 md:py-32"
        style={{ color: "var(--color-text)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-4">
            <SectionDivider />
            <h2 className="text-xl" style={{ fontFamily: "var(--font-body)" }}>
              Buku Tamu
            </h2>
            <div className="transform -scale-x-100">
              <SectionDivider />
            </div>
          </div>
          <p className="text-sm mt-4 max-w-xs mx-auto">
            Kirimkan doa dan ucapan terbaik Anda untuk kedua mempelai.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="classic-rose-surface w-full space-y-3 rounded-2xl p-5 text-left"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              className="p-3 text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg text-center font-medium"
            >
              {successMessage}
            </div>
          )}

          <div>
            <label htmlFor="wishes-name" className="text-xs font-semibold block">
              Nama
            </label>
            <input
              type="text"
              id="wishes-name"
              name="name"
              value={name}
              onChange={handleNameChange}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "wishes-name-error" : undefined}
              className="w-full p-2 mt-1 rounded border border-gray-300 text-sm text-gray-800 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary]"
              placeholder="Nama Anda"
            />
            {fieldErrors.name && (
              <p
                id="wishes-name-error"
                role="alert"
                aria-live="polite"
                className="text-xs text-red-500 font-medium mt-1"
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <span id="wishes-attendance-label" className="text-xs font-semibold block">
              Konfirmasi Kehadiran
            </span>
            <div
              role="radiogroup"
              aria-labelledby="wishes-attendance-label"
              aria-invalid={fieldErrors.attendance ? true : undefined}
              aria-describedby={fieldErrors.attendance ? "wishes-attendance-error" : undefined}
              className="flex gap-2 mt-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={attendance === "Hadir"}
                onClick={() => handleAttendanceChange("Hadir")}
                className={`flex-1 py-2 text-xs rounded min-h-[44px] min-w-[44px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary] ${
                  attendance === "Hadir"
                    ? "classic-rose-primary-action"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Hadir
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={attendance === "Tidak Hadir"}
                onClick={() => handleAttendanceChange("Tidak Hadir")}
                className={`flex-1 py-2 text-xs rounded min-h-[44px] min-w-[44px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary] ${
                  attendance === "Tidak Hadir"
                    ? "classic-rose-primary-action"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Tidak Hadir
              </button>
            </div>
            {fieldErrors.attendance && (
              <p
                id="wishes-attendance-error"
                role="alert"
                aria-live="polite"
                className="text-xs text-red-500 font-medium mt-1"
              >
                {fieldErrors.attendance}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="wishes-message" className="text-xs font-semibold block">
              Ucapan
            </label>
            <textarea
              id="wishes-message"
              name="message"
              value={message}
              onChange={handleMessageChange}
              rows={4}
              aria-invalid={fieldErrors.message ? true : undefined}
              aria-describedby={fieldErrors.message ? "wishes-message-error" : undefined}
              className="w-full p-2 mt-1 rounded border border-gray-300 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary]"
              placeholder="Tulis ucapan Anda..."
            />
            {fieldErrors.message && (
              <p
                id="wishes-message-error"
                role="alert"
                aria-live="polite"
                className="text-xs text-red-500 font-medium mt-1"
              >
                {fieldErrors.message}
              </p>
            )}
          </div>

          {fieldErrors.submit && (
            <p
              id="wishes-submit-feedback"
              role="alert"
              aria-live="polite"
              className="text-xs text-red-500 font-medium text-center"
            >
              {fieldErrors.submit}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="classic-rose-primary-action w-full py-2 rounded-lg font-semibold min-h-[44px] transition-opacity disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary]"
          >
            {isSubmitting ? "Mengirim..." : "Kirim Ucapan"}
          </button>
        </motion.form>

        {/* Wishes List Area */}
        <div className="w-full space-y-3">
          {status === "loading" && (
            <div
              role="status"
              aria-live="polite"
              className="w-full py-10 flex flex-col items-center justify-center gap-3 text-sm text-gray-600"
            >
              <div
                className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <p>Memuat ucapan…</p>
            </div>
          )}

          {status === "error" && (
            <div
              role="alert"
              aria-live="polite"
              className="w-full bg-red-50 border border-red-200 rounded-lg p-4 text-center text-sm space-y-3"
            >
              <p className="text-red-700 font-medium">
                {subscriptionError || "Gagal memuat ucapan. Silakan coba lagi."}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="classic-rose-primary-action inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg min-h-[44px] min-w-[44px] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary]"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {status === "ready" && skippedCount > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="w-full bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-xs text-center font-medium"
            >
              Beberapa ucapan tidak dapat ditampilkan karena format data tidak sesuai.
            </div>
          )}

          {status === "ready" && wishes.length === 0 && skippedCount === 0 && (
            <div
              role="status"
              className="classic-rose-surface w-full rounded-2xl p-6 text-center text-sm"
            >
              <p className="font-medium">Belum ada ucapan.</p>
              <p className="text-xs text-gray-500 mt-1">
                Jadilah yang pertama memberikan doa dan ucapan untuk kedua mempelai.
              </p>
            </div>
          )}

          {status === "ready" && wishes.length > 0 && (
            <div
              tabIndex={0}
              role="region"
              aria-label="Daftar ucapan dan doa"
              className="w-full max-h-96 overflow-y-auto space-y-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-primary]"
            >
              {wishes.map((wish) => (
                <motion.div
                  key={wish.id}
                  className="classic-rose-surface rounded-2xl p-3"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p
                      className="font-semibold text-sm"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {wish.name}
                    </p>
                    {wish.attendance && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          wish.attendance === "Hadir"
                            ? "bg-green-100 text-green-800"
                            : wish.attendance === "Tidak Hadir"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {wish.attendance}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1">{wish.message}</p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {wish.timestamp.toLocaleString("id-ID")}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WishesSection;
