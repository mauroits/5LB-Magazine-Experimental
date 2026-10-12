import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo5LB: React.FC<LogoProps> = ({
  className = 'h-8 sm:h-9',
}) => {
  return (
    <div className="flex items-center select-none">
      {/* Official 5LB Logo image without redundant text */}
      <img
        src="/Rivista-logo-200x65_web.png"
        alt="5LB"
        className={`${className} w-auto object-contain shrink-0`}
      />
    </div>
  );
};
