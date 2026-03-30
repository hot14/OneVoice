import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { X, CheckCircle2, Volume2, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { calculateNextReview } from "../lib/srsUtils";

interface ReviewSessionProps {
  onClose: () => void;
  onComplete: () => void;
}

export function ReviewSession({ onClose, onComplete }: ReviewSessionProps) {
  const { t, sourceLanguage } = useLanguage();
  const language = sourceLanguage;
  const [loading, setLoading] = useState(true);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchReviewQueue = async () => {
      if (!auth.currentUser) return;
      try {
        const vocabRef = collection(
          db,
          "users",
          auth.currentUser.uid,
          "vocabulary",
        );
        const now = new Date();
        // Fetch words that are due for review (nextReviewAt <= now)
        // Note: For simplicity, we fetch all and filter locally if needed,
        // but a query is better.
        const q = query(vocabRef, where("nextReviewAt", "<=", now));
        const snapshot = await getDocs(q);
        const queue: any[] = [];
        snapshot.forEach((doc) => queue.push({ ...doc.data(), id: doc.id }));
        
        // If queue is empty, maybe fetch some new ones or just return
        setReviewQueue(queue);
        setLoading(false);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `users/${auth.currentUser?.uid}/vocabulary`,
        );
        setLoading(false);
      }
    };

    fetchReviewQueue();
  }, []);

  const handleReview = async (quality: number) => {
    if (!auth.currentUser || isUpdating) return;
    setIsUpdating(true);

    const currentItem = reviewQueue[currentIndex];
    const { interval, easeFactor, repetitions, nextReviewAt } = calculateNextReview(
      quality,
      currentItem.interval || 0,
      currentItem.easeFactor || 2.5,
      currentItem.repetitions || 0
    );

    // Update mastery: 0-100 based on repetitions and quality
    const mastery = Math.min(100, (repetitions * 20) + (quality * 5));

    try {
      const vocabRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "vocabulary",
        currentItem.id,
      );
      await setDoc(
        vocabRef,
        {
          interval,
          easeFactor,
          repetitions,
          nextReviewAt,
          lastReviewedAt: serverTimestamp(),
          mastery,
        },
        { merge: true },
      );

      if (currentIndex < reviewQueue.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        onComplete();
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${auth.currentUser.uid}/vocabulary/${currentItem.id}`,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">{t("tutor.connecting")}</p>
        </div>
      </div>
    );
  }

  if (reviewQueue.length === 0) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("review.complete")}</h2>
          <p className="text-gray-500 mb-6">{t("dash.noReview")}</p>
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            {t("dash.readyDesc").split(".")[0]}
          </button>
        </div>
      </div>
    );
  }

  const currentItem = reviewQueue[currentIndex];

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-full sm:h-auto">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {currentIndex + 1} / {reviewQueue.length}
            </span>
            <h2 className="font-bold text-gray-900">{t("dash.reviewTitle")}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2">
              {t("review.thai")}
            </p>
            <h3 className="text-5xl font-bold text-gray-900 mb-4">{currentItem.thai}</h3>
            {currentItem.pronunciation && (
              <p className="text-xl text-gray-500">{currentItem.pronunciation}</p>
            )}
          </div>

          {showAnswer ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
              <div className="w-full h-px bg-gray-100 mb-8"></div>
              <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2">
                {t("review.meaning")}
              </p>
              <h4 className="text-3xl font-bold text-indigo-600 mb-8">
                {currentItem.meaning}
              </h4>
              
              {currentItem.exampleSentence && (
                <div className="mb-8 bg-gray-50 p-4 rounded-xl text-left border border-gray-100">
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2">
                    {language === 'ko' ? '예문' : 'Example'}
                  </p>
                  <p className="text-lg text-gray-800 italic mb-1">"{currentItem.exampleSentence}"</p>
                  {currentItem.exampleMeaning && (
                    <p className="text-sm text-gray-500">{currentItem.exampleMeaning}</p>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleReview(0)}
                  className="p-3 rounded-xl border-2 border-red-100 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex flex-col items-center"
                >
                  <span className="text-xs font-bold mb-1">{t("review.again")}</span>
                </button>
                <button
                  onClick={() => handleReview(1)}
                  className="p-3 rounded-xl border-2 border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors flex flex-col items-center"
                >
                  <span className="text-xs font-bold mb-1">{t("review.hard")}</span>
                </button>
                <button
                  onClick={() => handleReview(2)}
                  className="p-3 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex flex-col items-center"
                >
                  <span className="text-xs font-bold mb-1">{t("review.good")}</span>
                </button>
                <button
                  onClick={() => handleReview(3)}
                  className="p-3 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex flex-col items-center"
                >
                  <span className="text-xs font-bold mb-1">{t("review.easy")}</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {t("review.showAnswer")}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
