'use client';
import { motion } from 'motion/react';
import { SignIn } from '@clerk/nextjs';

export const AnimatedSignIn = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 1,
        ease: 'easeOut',
      }}
    >
      <SignIn
        appearance={{
          elements: {
            headerTitle: '!text-2xl !font-bold',
            headerSubtitle: '!hidden',
            formButtonPrimary:
              '!bg-primary !text-primary-foreground !py-2 !border-0 !outline-none hover:!bg-primary/90 !rounded-sm ',
            cardBox: '!shadow-none !border-0',
            card: '!p-2',
            footer: '!hidden ',
            input: '!p-4',
            socialButtonsBlockButton__google: '!py-3 !bg-white !rounded-sm !border-0 ',
          },
        }}
      />
    </motion.div>
  );
};
