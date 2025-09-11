'use client';

import { useEffect } from 'react';
import Img from 'next/image';
import { motion } from 'motion/react';

interface SuccessScreenProps {
  onRedirect: () => void;
}

export const SuccessScreen = ({ onRedirect }: SuccessScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRedirect();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onRedirect]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-full bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center space-y-8">
        {/* Success icon with animation */}
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.2,
          }}
        >
          <div className="w-32 h-32 mx-auto">
            <Img src="/done.svg" alt="Success" className="w-full h-full" width={160} height={180} />
          </div>
        </motion.div>

        <motion.div
          className="space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-foreground">We are all set!</h1>
          <p className="text-lg text-muted-foreground">Redirecting to dashboard...</p>
        </motion.div>

        {/* Loading bar for redirect countdown */}
        <motion.div
          className="w-64 bg-primary/20 rounded-full h-1 mx-auto overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 256, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <motion.div
            className="bg-primary h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 1, duration: 3, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
