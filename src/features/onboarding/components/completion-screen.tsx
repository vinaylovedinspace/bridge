'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Lottie from 'lottie-react';

type CompletionScreenProps = {
  onComplete: () => void;
};

const stages = [
  {
    animation: 'saving-branches',
    text: 'Saving your branches',
    duration: 3000,
  },
  {
    animation: 'getting-app-ready',
    text: 'Getting your app ready',
    duration: 3000,
  },
  {
    animation: 'almost-there',
    text: 'Almost there',
    duration: 3000,
  },
];

export const CompletionScreen = ({ onComplete }: CompletionScreenProps) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [animationsLoaded, setAnimationsLoaded] = useState(false);
  const [animationData, setAnimationData] = useState<Record<string, object>>({});
  const onCompleteRef = useRef(onComplete);

  // Update the ref when onComplete changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Preload all animations before showing the component
  useEffect(() => {
    const loadAnimations = async () => {
      try {
        const loadPromises = stages.map(async (stage) => {
          const response = await fetch(`/${stage.animation}.json`);
          if (!response.ok) {
            throw new Error(`Failed to load ${stage.animation}.json: ${response.status}`);
          }
          const data = await response.json();
          return { [stage.animation]: data };
        });

        const animationResults = await Promise.all(loadPromises);
        const allAnimations = animationResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});

        setAnimationData(allAnimations);
        setAnimationsLoaded(true);
      } catch (error) {
        console.error('Error loading animations:', error);
        // Still show the component even if animations fail to load
        setAnimationsLoaded(true);
      }
    };

    loadAnimations();
  }, []);

  useEffect(() => {
    // Only start timers when animations are loaded
    if (!animationsLoaded) return;

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
  }, [animationsLoaded]); // Start timers only when animations are loaded

  // Show loading state while animations are being preloaded
  if (!animationsLoaded) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-muted-foreground text-sm font-medium">Loading animations...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-16">
        {/* Left side - Lottie animation */}
        <motion.div
          className="w-64 h-64 flex items-center justify-center relative overflow-hidden"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            duration: 1,
            delay: 0.3,
            type: 'spring',
            stiffness: 100,
            damping: 15,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              className="w-full h-full flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{
                duration: 0.5,
                ease: 'easeInOut',
              }}
            >
              {animationData[stages[currentStage].animation] ? (
                <Lottie
                  animationData={animationData[stages[currentStage].animation]}
                  loop
                  className="w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <p className="text-muted-foreground text-sm font-medium">
                    Animation not available
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right side - stages */}
        <motion.div
          className="w-80"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            duration: 1,
            delay: 0.5,
            type: 'spring',
            stiffness: 100,
            damping: 15,
          }}
        >
          <motion.h1
            className="text-2xl font-semibold text-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 0.7,
              duration: 0.6,
              ease: 'easeOut',
            }}
          >
            Hang tight! We&apos;re getting everything ready
          </motion.h1>

          <div className="relative">
            {stages.map((stage, index) => {
              const isActive = index === currentStage;
              const isCompleted = index < currentStage;
              const isLast = index === stages.length - 1;

              return (
                <div key={index} className="relative">
                  {/* Connecting line */}
                  {!isLast && (
                    <motion.div
                      className="absolute left-3 top-6 w-0.5 h-6 bg-gradient-to-b from-green-500 to-green-500"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: isCompleted ? 24 : 0,
                        opacity: isCompleted ? 1 : 0.3,
                      }}
                      transition={{
                        duration: 0.8,
                        ease: 'easeInOut',
                        delay: isCompleted ? 0.3 : 0,
                      }}
                    />
                  )}

                  <motion.div
                    className="flex items-center gap-4 relative z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      delay: 0.9 + index * 0.2,
                      duration: 0.5,
                      ease: 'easeOut',
                    }}
                  >
                    <div className="relative">
                      <motion.div
                        className={`h-6 w-6 rounded-full border-2 shadow-sm flex items-center justify-center ${
                          isActive || isCompleted
                            ? 'bg-green-400 border-green-400 shadow-green-400/20'
                            : 'bg-background border-border'
                        }`}
                        animate={{
                          scale: isActive ? 1.1 : 1,
                          boxShadow: isActive
                            ? '0 0 20px rgba(34, 197, 94, 0.3)'
                            : '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                        transition={{
                          duration: 0.3,
                          ease: 'easeOut',
                        }}
                      >
                        {/* Simple green dot indicator */}
                        {(isActive || isCompleted) && (
                          <motion.div
                            className="w-2 h-2 bg-white rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              duration: 0.2,
                              ease: 'easeOut',
                            }}
                          />
                        )}
                      </motion.div>
                    </div>

                    <motion.p
                      className={`font-medium text-lg ${
                        isActive
                          ? 'text-foreground'
                          : isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      }`}
                      animate={{
                        x: isActive ? [0, 3, 0] : 0,
                        opacity: isActive ? 1 : isCompleted ? 0.9 : 0.6,
                      }}
                      transition={{
                        x: { duration: 3, repeat: isActive ? Infinity : 0, ease: 'easeInOut' },
                        opacity: { duration: 0.3 },
                      }}
                    >
                      {stage.text}
                    </motion.p>
                  </motion.div>

                  {!isLast && <div className="h-6" />}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
