'use client';
import { motion } from 'motion/react';
import { SignUp } from '@clerk/nextjs';
import { getAuthCardAppearance } from '@/lib/auth/auth-card-css';

export const AnimatedSignUp = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.5,
        ease: 'easeOut',
      }}
    >
      <SignUp appearance={getAuthCardAppearance} />
    </motion.div>
  );
};
