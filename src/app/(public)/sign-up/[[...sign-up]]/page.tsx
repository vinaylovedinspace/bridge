import { TypographyH1 } from '@/components/ui/typography';
import { AnimatedSignUp } from '@/components/animated-auth-component/animated-sign-up';
import { type Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign Up | Bridge',
  description: 'Create your Bridge account',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen" data-testid="signin-page">
      <div className="relative hidden w-1/2 bg-primary h-[calc(100vh-2rem)] lg:block rounded-3xl m-4">
        <div className="flex flex-col justify-between h-full">
          <TypographyH1 className="text-white pt-30 pl-16 max-w-2xl font-medium leading-14">
            <span style={{ fontFamily: 'var(--font-space-grotesk)' }}>
              Simplify Your Driving School Operations with{' '}
            </span>
            <span
              className="font-bold text-5xl"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              Bridge{' '}
            </span>
          </TypographyH1>
          <div className="flex relative justify-end w-full h-[50%]">
            <Image src="/dashboard-sample.svg" alt="Dashboard Sample" priority fill />{' '}
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <AnimatedSignUp />
      </div>
    </div>
  );
}
