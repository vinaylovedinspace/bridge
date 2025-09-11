import { TypographyH1 } from '@/components/ui/typography';
import { SignUp } from '@clerk/nextjs';
import { type Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign Up | Bridge',
  description: 'Create your Bridge account',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen" data-testid="signup-page">
      <div className="relative hidden w-1/2 bg-black h-screen lg:block">
        <div className="flex flex-col justify-between h-full">
          <TypographyH1 className="text-white pt-30 pl-16 max-w-2xl font-medium leading-14">
            <span style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              Simplify Your Driving School Operations with One Easy App
            </span>
          </TypographyH1>
          <div className="flex relative justify-end w-full h-[50%]">
            <Image src="/dashboard-sample.svg" alt="Dashboard Sample" priority fill />
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90',
              card: 'shadow-none',
              footer: '!hidden ',
              socialButtonsBlockButton__google: '!py-2 !bg-gray-50',
            },
          }}
        />
      </div>
    </div>
  );
}
