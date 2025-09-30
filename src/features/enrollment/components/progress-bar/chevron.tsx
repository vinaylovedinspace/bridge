import React from 'react';

type ChevronProps = {
  className?: string;
  fillClass: string;
  width?: number;
  height?: number;
};

export const Chevron = ({ className, fillClass, width = 214, height = 51 }: ChevronProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 214 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M0 0H201.521L214 26L201.521 51H0L12.4795 26L0 0Z" className={fillClass} />
    </svg>
  );
};
