'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Lottie from 'lottie-react';
import savingBranchesAnimation from '../assets/animations/saving-branches.json';
import gettingAppReadyAnimation from '../assets/animations/getting-app-ready.json';
import almostThereAnimation from '../assets/animations/almost-there.json';

type CompletionScreenProps = {
  onComplete: () => void;
};

const stages = [
  {
    animation: savingBranchesAnimation,
    text: 'Saving your branches',
    duration: 2000,
  },
  {
    animation: gettingAppReadyAnimation,
    text: 'Getting your app ready',
    duration: 2000,
  },
  {
    animation: almostThereAnimation,
    text: 'Almost there',
    duration: 2000,
  },
];

export const CompletionScreen = ({ onComplete }: CompletionScreenProps) => {
  const [currentStage, setCurrentStage] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // Update the ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let totalTime = 0;

    stages.forEach((stage, index) => {
      const timer = setTimeout(() => {
        setCurrentStage(index);
      }, totalTime);
      timers.push(timer);
      totalTime += stage.duration;
    });

    // Add the duration of the last stage to ensure it completes
    const finalTimer = setTimeout(() => {
      onCompleteRef.current();
    }, totalTime);
    timers.push(finalTimer);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []); // Start timers on mount

  return (
    <div className="flex items-center justify-center h-full bg-background">
      <div className="flex items-center gap-16">
        {/* Lottie animation */}
        <div className="w-64 h-64">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              <Lottie
                animationData={stages[currentStage].animation}
                loop
                className="w-full h-full"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress stages */}
        <div className="w-80">
          <h1 className="text-2xl font-semibold mb-8">
            Hang tight! We&apos;re getting everything ready
          </h1>

          <div className="space-y-6">
            {stages.map((stage, index) => {
              const isActive = index === currentStage;
              const isCompleted = index < currentStage;

              return (
                <div key={index} className="flex items-center gap-4 relative">
                  {/* Connecting line */}
                  {index < stages.length - 1 && (
                    <div
                      className="absolute left-3 top-6 w-0.5 h-6 bg-green-500 transition-opacity"
                      style={{ opacity: isCompleted ? 1 : 0.2 }}
                    />
                  )}

                  {/* Indicator */}
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center relative z-10 transition-all ${
                      isActive || isCompleted
                        ? 'bg-green-400 border-green-400 scale-110'
                        : 'bg-background border-border'
                    }`}
                  >
                    {(isActive || isCompleted) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>

                  {/* Text */}
                  <p
                    className={`font-medium text-lg transition-opacity ${
                      isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                    style={{ opacity: isActive ? 1 : isCompleted ? 0.9 : 0.6 }}
                  >
                    {stage.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
