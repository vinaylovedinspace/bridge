import { SignInTheme } from '@clerk/types';

export const getAuthCardAppearance: SignInTheme = {
  elements: {
    lastAuthenticationStrategyBadge: '!hidden',
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
};
